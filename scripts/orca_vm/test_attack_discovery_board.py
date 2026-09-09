#!/usr/bin/env python3
"""Guards for the attack-discovery board.

These assert the OUTCOME (what lands in the HTML), not that the operator
remembered to pass a flag. Run:  python3 test_attack_discovery_board.py
"""
import json
import subprocess
import sys
import tempfile
import os

HERE = os.path.dirname(os.path.abspath(__file__))
RENDER = os.path.join(HERE, "render_attack_discovery_board.py")

BASE = {
    "suiteId": "attack-discovery-agent-builder",
    "sourceDocCount": 100,
    "reportedTotal": 100,
    "modelCount": 1,
    "absentFields": ["totalRisk"],
    "models": [
        {
            "modelId": "test-model",
            "docs": 50,
            "datasets": 2,
            "discoveryCount": {"mean": 0.875, "n": 40},
            "alertsContextCount": {"mean": 2.5, "n": 40},
            "validatedDiscoveryCount": {"mean": 0.8, "n": 40},
            "status": {"completedRate": 1.0, "counts": {"completed": 40}, "n": 40},
            "latencySeconds": 35.7,
            "totalRisk": None,
            "evaluators": {"Latency": {"mean": 35.7, "n": 40}},
        }
    ],
}


def render(agg):
    with tempfile.TemporaryDirectory() as d:
        a = os.path.join(d, "agg.json")
        o = os.path.join(d, "out.html")
        with open(a, "w") as fh:
            json.dump(agg, fh)
        p = subprocess.run(
            [sys.executable, RENDER, "--aggregate", a, "--out", o],
            capture_output=True, text=True,
        )
        out = open(o).read() if os.path.exists(o) else ""
        return p.returncode, out


def main():
    failures = []

    # 1. Real numbers reach the HTML.
    rc, html = render(BASE)
    if rc != 0:
        failures.append(f"baseline render failed rc={rc}")
    if "0.88" not in html:
        failures.append("discoveryCount mean missing from HTML")
    if "35.7s" not in html:
        failures.append("latency missing from HTML")
    if "n=40" not in html:
        failures.append("coverage n missing -- a mean without n can misrepresent 7 docs as 1040")

    # 2. An absent field renders blank, never a number.
    if "--" not in html:
        failures.append("absent totalRisk did not render a blank marker")

    # 3. MUTATION: null out discoveries -> renderer must REFUSE, not emit a
    #    board full of blanks that looks fine at a glance.
    mutated = json.loads(json.dumps(BASE))
    mutated["models"][0]["discoveryCount"]["mean"] = None
    rc_m, _ = render(mutated)
    if rc_m == 0:
        failures.append("MUTATION NOT CAUGHT: renderer accepted an aggregate with no discoveries")

    # 4. MUTATION: empty model list -> must refuse.
    empty = json.loads(json.dumps(BASE))
    empty["models"] = []
    rc_e, _ = render(empty)
    if rc_e == 0:
        failures.append("MUTATION NOT CAUGHT: renderer accepted an empty aggregate")

    # 5. The shape-mismatch disclosure must be present -- this is the claim that
    #    stops the board being read as a 1:1 reproduction.
    if "not a 1:1 reproduction" not in html:
        failures.append("shape-mismatch disclosure missing from board")

    for f in failures:
        print("FAIL:", f)
    if failures:
        sys.exit(1)
    print("ok - 5 guard groups passed (2 mutations correctly rejected)")


if __name__ == "__main__":
    main()
