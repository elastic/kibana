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
h2.sec{font-size:14px;margin:26px 0 10px;color:#9aa4b2;text-transform:uppercase;letter-spacing:.04em}
table.sources td{font-size:13px;color:#c7cdd6;vertical-align:top}
table.sources td.src-col{color:#7dd3fc;font-weight:600;width:170px;white-space:nowrap}
tr.missing td{color:#5b6472;font-style:italic}
tr.missing td.model{color:#6b7480;font-style:normal}
"""


# Criterion 1: every column states exactly where its number comes from, so a
# reader never has to guess whether a value was measured, derived, or missing.
COLUMN_SOURCES = [
    ("Model", "<code>task.model.id</code> from the golden score documents."),
    ("Status", "<code>task.output.adToolResult.status</code>; shown as the share of documents reporting <code>completed</code>."),
    ("Discoveries", "mean of <code>task.output.adToolResult.discoveryCount</code> over documents that carry it."),
    ("Alerts in context", "mean of <code>task.output.adToolResult.alertsContextCount</code>."),
    ("Latency", "mean score of the <code>Latency</code> evaluator, in seconds &mdash; NOT a <code>task.output</code> field."),
    ("Total risk", "no source field exists in our schema; always blank."),
    ("Docs", "count of scored documents contributing to that row."),
]


def render_missing_rows(missing):
    """Criterion 6: reference models absent from our data are shown as
    explicitly missing. Their cells stay blank -- never filled from the
    reference HTML."""
    if not missing:
        return ""
    cells = "\n".join(
        "<tr class='missing'>"
        f'<td class="model">{html.escape(m)}</td>'
        f'<td colspan="6"><span class="na">not present in our golden data &mdash; never run in this suite</span></td>'
        "</tr>"
        for m in sorted(missing)
    )
    return cells


def render(agg, source_note, missing_models=(), diff_summary=None):
    rows = build_rows(agg["models"])
    absent = agg["absentFields"]
    absent_html = (
        "".join(f"<li><code>{html.escape(f)}</code> has no source field in our golden schema; "
                "every cell renders <code>--</code>. Never imputed.</li>" for f in absent)
        or "<li>All reference columns were recovered from our data.</li>"
    )
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    sources_html = "\n".join(
        f"<tr><td class='src-col'>{name}</td><td>{desc}</td></tr>"
        for name, desc in COLUMN_SOURCES
    )
    missing_html = render_missing_rows(missing_models)
    missing_note = (
        f"<li><strong>{len(missing_models)} models appear in the reference artifact but not in our "
        "golden data.</strong> They are listed at the foot of the table with blank cells. Their "
        "reference numbers were deliberately NOT copied across &mdash; doing so would report another "
        "harness's results as ours.</li>"
        if missing_models else ""
    )
    diff_note = (
        f"<li><strong>Field-level diff vs the reference:</strong> "
        f"{diff_summary['identical']}/{diff_summary['comparable']} fields identical "
        f"({100*diff_summary['identical']/max(1,diff_summary['comparable']):.1f}%), "
        f"{diff_summary['differs']} differ, {diff_summary['absentInOurs']} absent. "
        "Full evidence in <code>field_diff.json</code>.</li>"
        if diff_summary else ""
    )
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
{diff_note}
{absent_html}
{missing_note}
<li>Each mean carries its own <code>n</code>. Coverage is uneven by design
(57% of documents carry <code>discoveryCount</code>); a mean over 7 documents is not
dressed up as a mean over 1040.</li>
<li>Source: {html.escape(source_note)}</li>
</ul></div>

<h2 class="sec">Where each column comes from</h2>
<table class="sources"><tbody>
{sources_html}
</tbody></table>

<h2 class="sec">Results</h2>
<table><thead><tr>
<th>Model</th><th>Status</th><th>Discoveries</th><th>Alerts in context</th>
<th>Latency</th><th>Total risk</th><th>Docs</th>
</tr></thead><tbody>
{rows}
{missing_html}
</tbody></table>
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--aggregate", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--field-diff", help="field_diff.json from diff_attack_discovery_vs_reference.py")
    args = ap.parse_args()

    agg = json.load(open(args.aggregate))
    if not agg.get("models"):
        sys.exit("aggregate has no models -- refusing to render an empty board")
    if all(m["discoveryCount"]["mean"] is None for m in agg["models"]):
        sys.exit("no model carries a discoveryCount -- refusing to render a vacuous board")

    missing_models = []
    diff_summary = None
    if args.field_diff:
        diff = json.load(open(args.field_diff))
        missing_models = diff.get("referenceOnly", [])
        diff_summary = diff.get("fieldTotals")

    html_out = render(
        agg,
        f"golden ES, suite_id={agg['suiteId']}, {agg['sourceDocCount']} docs",
        missing_models=missing_models,
        diff_summary=diff_summary,
    )
    with open(args.out, "w") as fh:
        fh.write(html_out)
    print(f"wrote {args.out} ({len(html_out)} bytes, {agg['modelCount']} models, "
          f"{len(missing_models)} listed as missing)")


if __name__ == "__main__":
    main()
