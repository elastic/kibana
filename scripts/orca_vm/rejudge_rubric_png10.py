#!/usr/bin/env python3
"""Score frozen transcripts on a 0-10 rubric (PNG-reference-compatible).

Reads a frozen transcripts JSONL (extract_transcripts.py shape), calls judge
models through 9router (OpenAI-compatible), and writes one row per
(cell, judge) with overall + 4 dims. Balanced-object parser with truncation
repair (gpt-5.5 finish=stop mid-rationale mode), retries, env-keyed auth.

Env:
    JUDGE_BASE_URL   e.g. https://9router.widzimysie.pl
    JUDGE_API_KEY    router key (never committed)
Usage:
    python3 rejudge_rubric_png10.py --frozen frozen/transcripts.jsonl \
        --out results/png10.jsonl [--judges j1,j2] [--workers 8] [--limit N]
"""
from __future__ import annotations

import argparse
import json
import os
import random
import re
import subprocess
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor

BASE_URL = os.environ.get("JUDGE_BASE_URL", "https://9router.widzimysie.pl").rstrip("/v1")
API_KEY = os.environ.get("JUDGE_API_KEY", "")

DEFAULT_JUDGES = ["omni-opus-5"]

MAX_TOKENS = 2048

RUBRIC = """You are grading an AI security assistant's answer to a security analyst's question.

Score ONE overall number from 0 to 10 (one decimal allowed):
- overall: how well the assistant answered the question, weighed across correctness, groundedness, completeness, and actionability.

Also score each dimension from 0 to 100 (integers):
- correctness: factual accuracy of claims about the alert/data
- groundedness: claims supported by the tools/evidence available, no invention
- completeness: covers what the question actually asked
- actionability: gives a clear, usable recommendation

Return ONLY a JSON object, no prose, no code fence:
{"overall": <0-10>, "correctness": <0-100>, "groundedness": <0-100>, "completeness": <0-100>, "actionability": <0-100>, "rationale": "<one sentence>"}"""

_print_lock = threading.Lock()


def build_prompt(rec: dict) -> str:
    parts = [f"# Question\n{rec['question']}"]
    if rec.get("attachment"):
        parts.append(f"# Attached context\n{rec['attachment']}")
    steps = rec.get("steps")
    if isinstance(steps, list) and steps:
        tools = [s.get("tool_id") or s.get("toolId") or s.get("type")
                 for s in steps if isinstance(s, dict) and s.get("type") == "tool_call"]
        if tools:
            parts.append("# Tools the assistant called\n" + ", ".join(str(t) for t in tools[:40]))
    parts.append(f"# Assistant's answer\n{rec['answer_text']}")
    return "\n\n".join(parts)


def parse_scores(text: str):
    if not text:
        return None
    cleaned = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.M).strip()
    candidates = [cleaned]
    depth = 0
    start = None
    in_str = False
    esc = False
    for idx, ch in enumerate(cleaned):
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "{":
            if depth == 0:
                start = idx
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start is not None:
                candidates.append(cleaned[start:idx + 1])
                start = None
    for cand in candidates:
        try:
            obj = json.loads(cand, strict=False)
        except json.JSONDecodeError:
            # Truncated tail (finish=stop mid-rationale, seen on gpt-5.5-none):
            # the numeric fields survive before the cut. Repair by closing the
            # string/object naively and retrying once.
            repaired = cand
            if '"rationale"' in repaired:
                repaired = repaired.split('"rationale"')[0] + '"rationale": ""}'
            try:
                obj = json.loads(repaired, strict=False)
            except json.JSONDecodeError:
                continue
        if not isinstance(obj, dict):
            continue
        ov = obj.get("overall")
        dims = {}
        ok = isinstance(ov, (int, float)) and not isinstance(ov, bool) and 0 <= float(ov) <= 10
        if ok:
            for dim in ("correctness", "groundedness", "completeness", "actionability"):
                v = obj.get(dim)
                if isinstance(v, (int, float)) and not isinstance(v, bool):
                    dims[dim] = float(v)
                else:
                    ok = False
                    break
        if ok:
            return {"overall": float(ov), **dims,
                    "rationale": str(obj.get("rationale", ""))[:300]}
    return None


def call_judge(judge: str, prompt: str, timeout: int, retries: int = 3, key: str = ""):
    body = {
        "model": judge,
        "messages": [{"role": "system", "content": RUBRIC},
                     {"role": "user", "content": prompt}],
        "max_tokens": MAX_TOKENS,
        "temperature": 0,
    }
    last = "no attempt"
    for attempt in range(retries):
        started = time.time()
        cmd = ["curl", "-s", "-m", str(timeout), "-H", "Content-Type: application/json"]
        if key or API_KEY:
            cmd += ["-H", f"Authorization: Bearer {key or API_KEY}"]
        cmd += [f"{BASE_URL}/v1/chat/completions", "-d", json.dumps(body)]
        proc = subprocess.run(cmd, capture_output=True, text=True)
        elapsed = time.time() - started
        try:
            payload = json.loads(proc.stdout)
        except json.JSONDecodeError:
            last = f"non-JSON: {proc.stdout[:120]}"
            time.sleep(2 ** attempt + random.random())
            continue
        if "error" in payload:
            last = f"api error: {str(payload['error'])[:120]}"
            time.sleep(2 ** attempt + random.random())
            continue
        choice = (payload.get("choices") or [{}])[0]
        content = (choice.get("message") or {}).get("content")
        scores = parse_scores(content or "")
        if scores is None:
            last = f"unparseable (finish={choice.get('finish_reason')}): {str(content)[:120]}"
            time.sleep(2 ** attempt + random.random())
            continue
        usage = payload.get("usage") or {}
        return {"ok": True, "scores": scores, "latency_s": round(elapsed, 2),
                "output_tokens": usage.get("completion_tokens")}
    return {"ok": False, "error": last}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--frozen", default="./frozen_v2/transcripts.jsonl")
    ap.add_argument("--out", default="./results/png10.jsonl")
    per = ap.add_mutually_exclusive_group()
    per.add_argument("--judges", default=",".join(DEFAULT_JUDGES))
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--timeout", type=int, default=180)
    ap.add_argument("--seed", type=int, default=1788)
    args = ap.parse_args()

    judges = [j.strip() for j in args.judges.split(",") if j.strip()]
    recs = [json.loads(l) for l in open(args.frozen)]
    recs = [r for r in recs if not r.get("empty_answer")]
    recs.sort(key=lambda r: (r["model"], r["example_id"]))
    if args.limit:
        random.Random(args.seed).shuffle(recs)
        recs = recs[:args.limit]
        recs.sort(key=lambda r: (r["model"], r["example_id"]))

    tasks = [(r, j) for r in recs for j in judges]
    print(f"cells={len(recs)}  judges={len(judges)}  calls={len(tasks)}", flush=True)

    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    done = {"n": 0, "ok": 0, "fail": 0}
    out_fh = open(args.out, "w")
    _lock = threading.Lock()

    def run(task):
        rec, judge = task
        res = call_judge(judge, build_prompt(rec), args.timeout)
        row = {"model": rec["model"], "example_id": rec["example_id"],
               "judge": judge, "res": res}
        with _lock:
            out_fh.write(json.dumps(row) + "\n")
            out_fh.flush()
            done["n"] += 1
            done["ok" if res["ok"] else "fail"] += 1
            if done["n"] % 50 == 0:
                print(f"  {done['n']}/{len(tasks)} ok={done['ok']} fail={done['fail']}", flush=True)

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        list(ex.map(run, tasks))
    out_fh.close()
    print(f"DONE cells={len(recs)} calls={len(tasks)} ok={done['ok']} fail={done['fail']}", flush=True)


if __name__ == "__main__":
    main()
