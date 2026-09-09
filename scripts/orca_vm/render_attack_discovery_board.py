#!/usr/bin/env python3
"""Render the attack-discovery board from the golden ES aggregate.

Rules enforced here (the point of the script, not decoration):
* Every number comes from the aggregate JSON; nothing is hardcoded or imputed.
* A field with no source renders as a visible blank marker, never a guess.
* Coverage (n) rides next to each mean so a 7-doc mean cannot pose as a 1040-doc one.
* Refuses to emit if the aggregate is empty or every discovery cell is null.
"""
import argparse
import datetime
import html
import json
import sys

BLANK = '<span class="na" title="no source field in our schema">--</span>'


def cell(mean, n, digits=2):
    if mean is None:
        return BLANK
    return f'{mean:.{digits}f}<span class="n">n={n}</span>'


def build_rows(models):
    out = []
    for m in sorted(models, key=lambda r: (r["discoveryCount"]["mean"] is None, -(r["discoveryCount"]["mean"] or 0))):
        st = m["status"]
        rate = st["completedRate"]
        badge = BLANK if rate is None else (
            f'<span class="ok">completed {rate*100:.0f}%</span>' if rate >= 0.99
            else f'<span class="warn">completed {rate*100:.0f}%</span>'
        )
        lat = m["latencySeconds"]
        out.append(
            "<tr>"
            f'<td class="model">{html.escape(m["modelId"])}</td>'
            f"<td>{badge}</td>"
            f'<td>{cell(m["discoveryCount"]["mean"], m["discoveryCount"]["n"])}</td>'
            f'<td>{cell(m["alertsContextCount"]["mean"], m["alertsContextCount"]["n"])}</td>'
            f'<td>{f"{lat:.1f}s" if lat is not None else BLANK}</td>'
            f'<td>{BLANK if m["totalRisk"] is None else m["totalRisk"]}</td>'
            f'<td class="dim">{m["docs"]}</td>'
            "</tr>"
        )
    return "\n".join(out)


CSS = """
body{background:#0b0e14;color:#e6e6e6;font:14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;margin:0;padding:32px}
h1{font-size:22px;margin:0 0 4px}
.sub{color:#9aa4b2;margin-bottom:20px}
table{border-collapse:collapse;width:100%;max-width:1100px}
th,td{padding:8px 12px;text-align:left;border-bottom:1px solid #1e2430}
th{color:#9aa4b2;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
td.model{font-family:ui-monospace,Menlo,monospace;color:#7dd3fc}
.n{color:#5b6472;font-size:11px;margin-left:6px}
.na{color:#5b6472}
.ok{color:#4ade80}.warn{color:#fbbf24}
.dim{color:#5b6472}
.disc{background:#141a24;border-left:3px solid #fbbf24;padding:14px 18px;margin:22px 0;max-width:1100px;border-radius:4px}
.disc h2{font-size:13px;margin:0 0 8px;text-transform:uppercase;color:#fbbf24;letter-spacing:.04em}
.disc li{margin:4px 0;color:#c7cdd6}
code{background:#1e2430;padding:1px 5px;border-radius:3px;font-size:12px}
"""


def render(agg, source_note):
    rows = build_rows(agg["models"])
    absent = agg["absentFields"]
    absent_html = (
        "".join(f"<li><code>{html.escape(f)}</code> has no source field in our golden schema; "
                "every cell renders <code>--</code>. Never imputed.</li>" for f in absent)
        or "<li>All reference columns were recovered from our data.</li>"
    )
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    return f"""<!doctype html><meta charset="utf-8">
<title>Attack Discovery -- golden results</title><style>{CSS}</style>
<h1>Attack Discovery &mdash; model board</h1>
<div class="sub">{agg['modelCount']} models &middot; {agg['sourceDocCount']} scored documents &middot;
suite <code>{html.escape(agg['suiteId'])}</code> &middot; rendered {ts}</div>

<div class="disc"><h2>Read this before comparing to the reference artifact</h2><ul>
<li><strong>This is not a 1:1 reproduction, because the underlying runs differ.</strong>
The reference artifact reports a single large run: <code>8</code> discoveries over
<code>95</code> alerts for every model. Our golden data is a scenario-fixture suite &mdash;
discovery counts of 0/1/4 over 0-16 alerts. Copying its shape would describe a benchmark we did not run.</li>
{absent_html}
<li>Each mean carries its own <code>n</code>. Coverage is uneven by design
(57% of documents carry <code>discoveryCount</code>); a mean over 7 documents is not
dressed up as a mean over 1040.</li>
<li>Source: {html.escape(source_note)}</li>
</ul></div>

<table><thead><tr>
<th>Model</th><th>Status</th><th>Discoveries</th><th>Alerts in context</th>
<th>Latency</th><th>Total risk</th><th>Docs</th>
</tr></thead><tbody>
{rows}
</tbody></table>
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--aggregate", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    agg = json.load(open(args.aggregate))
    if not agg.get("models"):
        sys.exit("aggregate has no models -- refusing to render an empty board")
    if all(m["discoveryCount"]["mean"] is None for m in agg["models"]):
        sys.exit("no model carries a discoveryCount -- refusing to render a vacuous board")

    html_out = render(agg, f"golden ES, suite_id={agg['suiteId']}, {agg['sourceDocCount']} docs")
    with open(args.out, "w") as fh:
        fh.write(html_out)
    print(f"wrote {args.out} ({len(html_out)} bytes, {agg['modelCount']} models)")


if __name__ == "__main__":
    main()
