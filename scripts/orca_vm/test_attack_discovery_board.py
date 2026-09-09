#!/usr/bin/env python3
"""Guards for the attack-discovery board.

These assert the OUTCOME (what lands in the HTML), not that the operator
remembered to pass a flag. Run:  python3 test_attack_discovery_board.py
"""
import json
import re
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


def render(agg, missing=()):
    with tempfile.TemporaryDirectory() as d:
        a = os.path.join(d, "agg.json")
        o = os.path.join(d, "out.html")
        with open(a, "w") as fh:
            json.dump(agg, fh)
        cmd = [sys.executable, RENDER, "--aggregate", a, "--out", o]
        if missing:
            m = os.path.join(d, "missing.json")
            with open(m, "w") as fh:
                json.dump({"referenceOnly": list(missing)}, fh)
            cmd += ["--field-diff", m]
        p = subprocess.run(cmd, capture_output=True, text=True)
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

    # 6. Criterion 1: every column must state its source, or a reader cannot
    #    tell a measured number from a derived one.
    for col in ("Discoveries", "Latency", "Total risk"):
        if f"<td class='src-col'>{col}</td>" not in html:
            failures.append(f"column source missing for {col}")

    # 7. Criterion 6: reference models absent from our data render as explicitly
    #    missing rows with NO numbers -- never populated from the reference HTML.
    rc_m2, html_m2 = render(BASE, missing=["ref-only-model-a", "ref-only-model-b"])
    if rc_m2 != 0:
        failures.append("render with missing models failed")
    if "ref-only-model-a" not in html_m2:
        failures.append("missing model not listed on the board")
    if "never run in this suite" not in html_m2:
        failures.append("missing models lack an explicit not-in-our-data label")
    body_m2 = html_m2[html_m2.rfind("<tbody>"):]
    for row in re.findall(r"<tr\b([^>]*)>(.*?)</tr>", body_m2, re.S):
        if "missing" not in row[0]:
            continue
        cells = re.findall(r"<td[^>]*>(.*?)</td>", row[1], re.S)
        for cell in cells[1:]:
            if re.search(r"\d", re.sub(r"<[^>]+>", "", cell)):
                failures.append("MUTATION RISK: a missing-model row carries numeric data")

    # 8. MUTATION: a renderer that fills missing rows from the reference would
    #    put the reference constants (8 discoveries / 95 alerts) in data cells.
    body = html[html.rfind("<tbody>"):]
    for row in re.findall(r"<tr\b([^>]*)>(.*?)</tr>", body, re.S):
        if "missing" in row[0]:
            continue
        cells = [re.sub(r"<[^>]+>", "", c).strip() for c in re.findall(r"<td[^>]*>(.*?)</td>", row[1], re.S)]
        if len(cells) >= 4 and (re.match(r"^8(\s|$)", cells[2]) or re.match(r"^95(\s|$)", cells[3])):
            failures.append(f"reference constant leaked into a data cell: {cells[:4]}")

    for f in failures:
        print("FAIL:", f)
    if failures:
        sys.exit(1)
    print("ok - 8 guard groups passed (2 mutations correctly rejected)")


if __name__ == "__main__":
    main()
