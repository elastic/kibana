#!/usr/bin/env python3
"""Probe judge candidates through 9router with a REAL rubric call.

Models vanish from the router catalog mid-run; a probe is a real 1-cell call
through the final code path (same parser, same auth) before a panel commits
to a judge list. Prints OK/FAIL + latency per candidate.

Env: JUDGE_BASE_URL, JUDGE_API_KEY (see .selfhost-judge.env for the shape).
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rejudge_rubric_png10 as score_png10  # noqa: E402

env = {}
# Key material lives OUTSIDE the repo (.selfhost-judge.env is gitignored);
# fall back to sibling path so the probe works from any checkout.
ENV_CANDIDATES = [
    os.path.join(os.path.dirname(os.path.abspath(__file__)), ".selfhost-judge.env"),
    os.path.expanduser("~/.elastic/.selfhost-judge.env"),
]
env_path = next((p for p in ENV_CANDIDATES if os.path.exists(p)), None)
if not env_path:
    sys.exit("no .selfhost-judge.env found (sibling or ~/.elastic/) — probe needs judge creds")
with open(env_path) as fh:
    for line in fh:
        m = re.match(r"""\s*export\s+(\w+)=["']?(.+?)["']?\s*$""", line)
        if m:
            env[m.group(1)] = m.group(2)

os.environ["JUDGE_BASE_URL"] = env["SELFHOST_UPSTREAM"]
os.environ["JUDGE_API_KEY"] = env["SELFHOST_API_KEY"]
import importlib
importlib.reload(score_png10)

CANDIDATES = [
    "openrouter/google/gemini-3.1-pro-preview",
    "claude/claude-sonnet-5",
    "cu/gpt-5.5-none",
    "opencode/qwen3.6-plus",
    "omni-opus-5",
]

probe_rec = {
    "question": "An alert fired on srv-web-01 for repeated failed logins from one external IP. What's going on and what should I do?",
    "attachment": None,
    "steps": [{"type": "tool_call", "tool_id": "alerts_lookup"}],
    "answer_text": "This is likely a brute-force login attempt targeting srv-web-01. The IP generated repeated authentication failures, consistent with credential-stuffing. Recommended: block the IP at the edge firewall, check for any successful logins from the same IP in the last 24h, and reset credentials if a success is found.",
}

print(f"endpoint: {score_png10.BASE_URL}")
for j in CANDIDATES:
    res = score_png10.call_judge(j, score_png10.build_prompt(probe_rec), 90)
    if res.get("ok"):
        s = res["scores"]
        print(f"  OK    {j:42} overall={s['overall']:.1f} dims=({s['correctness']:.0f},{s['groundedness']:.0f},{s['completeness']:.0f},{s['actionability']:.0f}) lat={res['latency_s']}s")
    else:
        print(f"  FAIL  {j:42} {res.get('error', '')[:90]}")
