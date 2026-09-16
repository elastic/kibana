#!/usr/bin/env python3
"""Outcome-based guards for the agent_eval_full board renderer.

Renders a synthetic traces payload through the REAL renderer CLI and asserts
what lands in the HTML: reference row order, usage ("Xs · Y/Z tok") format,
missing-row reasons, blank cells, disclosure block, and reproducibility
(byte-identical modulo the timestamp).
"""
import json
import subprocess
import sys
import tempfile
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
RENDER = os.path.join(HERE, "render_agent_eval_full.py")

# Synthetic cells: two covered models (one with usage, one without) + enough
# reference models to prove ORDER comes from REFERENCE_MODELS, not coverage.
CELLS = {}
# Synthetic cells on REAL reference models: haiku (with usage, order pos 1)
# and gp-llm-v2 (no usage, pos 6) — proves order comes from REFERENCE_MODELS
# and exercises both usage shapes. Only 2 of 21 prompts per model so blank
# cells render too.
for prompt in ["alert-analysis-a", "alert-analysis-b"]:
    CELLS[f"anthropic-claude-4.5-haiku:{prompt}"] = {
        "question": f"q {prompt}",
        "answer": f"answer {prompt}",
        "steps": [{"type": "reasoning", "text": "think"}],
        "stepCount": 3,
        "scores": {"Rubric": 1.0},
        "repetitions": 1,
        "usage": {"durNs": 17_400_000_000, "inTok": 57029, "outTok": 1209},
    }
    CELLS[f"gp-llm-v2:{prompt}"] = {
        "question": f"q {prompt}",
        "answer": None,
        "steps": [],
        "stepCount": 1,
        "scores": {},
        "repetitions": 1,
        "usage": {"durNs": 0, "inTok": 0, "outTok": 0},
    }

TRACES = {
    "cells": CELLS,
    "meta": {
        "since": "2026-09-01T00:00Z",
        "until": None,
        "scoreDocs": 42,
        "argSpans": 7,
        "usageSpans": 5,
        "note": "synthetic",
    },
}


def render(traces, out):
    with tempfile.TemporaryDirectory() as d:
        t = os.path.join(d, "traces.json")
        with open(t, "w") as fh:
            json.dump(traces, fh)
        p = subprocess.run(
            [sys.executable, RENDER, "--traces", t, "--out", out, "--since", "2026-09-01T00:00Z"],
            capture_output=True, text=True)
        return p.returncode


def main():
    fails = []
    d = tempfile.mkdtemp()
    out1, out2 = os.path.join(d, "a.html"), os.path.join(d, "b.html")

    rc = render(TRACES, out1)
    if rc != 0:
        print("FAIL: renderer exited", rc)
        return 1
    h = open(out1, encoding="utf-8").read()

    def check(name, cond):
        print(("ok: " if cond else "FAIL: ") + name)
        if not cond:
            fails.append(name)

    # 1. all 33 reference models present, exactly once each
    rows = re.findall(r'<tr[^>]*>\s*<td[^>]*class="model"[^>]*>(.*?)(?:<br>|</td>)', h, re.S)
    # rows include missing-rows; extract ids from both shapes
    ids = re.findall(r'<td class="model">([^<]+)</td>', h)
    from render_agent_eval_full import REFERENCE_MODELS, PROMPT_IDS
    check("33 reference models each rendered once",
          sorted(ids) == sorted(REFERENCE_MODELS) and len(ids) == 33)
    check("row order matches REFERENCE_MODELS order", ids == REFERENCE_MODELS)

    # 2. usage format: "17s · 57029/1209 tok" under the step count
    check("usage cell rendered in reference format",
          re.search(r'17s · 57029/1209 tok', h) is not None)
    check("usage css class applied", 'class="usage"' in h)
    # 3. no-usage cell shows steps only (no empty usage span)
    check("zero-usage cell renders no usage text",
          re.search(r'<span class="usage"></span>', h) is None)

    # 4. missing-row reasons surface verbatim
    check("no-EIS-connector reason present", "no EIS connector exists" in h)
    check("glm-5-2 blocked reason present", "#288469" in h)

    # 5. disclosure block carries provenance + usage coverage
    check("usage join disclosed", "gen_ai.usage" in h and "tok" in h)
    check("usage-cell count disclosed", re.search(r'\d+ cells carry usage', h) is not None)

    # 6. blank cell marker
    check("blank cell marker present", "&mdash;" in h)

    # 7. reproducibility: byte-identical modulo timestamp line
    render(TRACES, out2)
    h2 = open(out2, encoding="utf-8").read()
    strip = lambda s: re.sub(r'Generated: [^<]+', '', s)
    check("re-render byte-identical modulo timestamp", strip(h) == strip(h2))

    print()
    if fails:
        print(f"FAILURES: {len(fails)} {fails}")
        return 1
    print("all checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
