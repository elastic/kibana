#!/usr/bin/env python3
"""Tests for the ported rubric-rejudge tooling (rejudge_rubric_png10.py).

Outcome-based: each check asserts a property of parsed output, not line
numbers. Run:  python3 test_rejudge_rubric_png10.py
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rejudge_rubric_png10 as S  # noqa: E402

FAILS = []


def check(name, cond):
    print(f"{'ok' if cond else 'FAIL'}: {name}")
    if not cond:
        FAILS.append(name)


# --- parse_scores: the guards that make panel data trustworthy -------------
good = '{"overall": 7.5, "correctness": 80, "groundedness": 75, "completeness": 70, "actionability": 85, "rationale": "solid"}'
check("parses a valid object", S.parse_scores(good) is not None)
check("overall is a float in 0-10", (S.parse_scores(good) or {}).get("overall") == 7.5)

out_of_range = good.replace("7.5", "12.0")
check("rejects overall > 10", S.parse_scores(out_of_range) is None)

missing_dim = '{"overall": 7.5, "correctness": 80, "rationale": "x"}'
check("rejects missing dims", S.parse_scores(missing_dim) is None)

fenced = f"```json\n{good}\n```"
check("parses fenced json", S.parse_scores(fenced) is not None)

# gpt-5.5 truncation mode: finish=stop mid-rationale. The numeric fields all
# survive before the cut; the repair closes the object and keeps them.
truncated = '{"overall":6.0,"correctness":55,"groundedness":45,"completeness":65,"actionability":75,"rationale":"The answer gives a c'
check("repairs truncated tail (gpt-5.5 mode)", S.parse_scores(truncated) is not None)
rep = S.parse_scores(truncated)
check("repaired scores keep all dims",
      rep and all(k in rep for k in ("correctness", "groundedness", "completeness", "actionability")))

two = good + '{"overall": 3.0, "correctness": 30, "groundedness": 30, "completeness": 30, "actionability": 30, "rationale": "b"}'
check("takes FIRST object when adjacent", (S.parse_scores(two) or {}).get("overall") == 7.5)

print()
if FAILS:
    print(f"{len(FAILS)} FAIL: {FAILS}")
    sys.exit(1)
print("all checks passed")
