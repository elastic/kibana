#!/usr/bin/env python3
"""Generate a Markdown summary report from computed metrics."""

import json
from pathlib import Path

METRICS_FILE = Path(__file__).parent / "data" / "metrics.json"
OUTPUT_FILE = Path(__file__).parent / "output" / "summary.md"


def fmt_hours(h) -> str:
    if h is None:
        return "N/A"
    if h < 24:
        return f"{h:.1f}h"
    days = h / 24
    return f"{days:.1f}d"


def fmt_pct(rate) -> str:
    if rate is None:
        return "N/A"
    return f"{rate * 100:.1f}%"


def generate():
    with open(METRICS_FILE) as f:
        metrics = json.load(f)

    s = metrics["summary"]
    monthly = metrics["monthly"]
    months = sorted(monthly.keys())

    # Compute trends (first 3 months vs last 3 months)
    early_months = months[:3]
    late_months = months[-3:]

    def avg_metric(month_list, key, subkey=None):
        vals = []
        for m in month_list:
            v = monthly[m].get(key)
            if subkey and isinstance(v, dict):
                v = v.get(subkey)
            if v is not None:
                vals.append(v)
        return sum(vals) / len(vals) if vals else None

    early_cycle = avg_metric(early_months, "pr_cycle_time", "p50")
    late_cycle = avg_metric(late_months, "pr_cycle_time", "p50")
    early_throughput = avg_metric(early_months, "pr_throughput")
    late_throughput = avg_metric(late_months, "pr_throughput")
    early_bugs = avg_metric(early_months, "bug_count")
    late_bugs = avg_metric(late_months, "bug_count")
    early_resolution = avg_metric(early_months, "bug_resolution_time", "p50")
    late_resolution = avg_metric(late_months, "bug_resolution_time", "p50")
    early_ai = avg_metric(early_months, "ai_commit_rate")
    late_ai = avg_metric(late_months, "ai_commit_rate")

    def trend_arrow(early, late):
        if early is None or late is None:
            return ""
        pct = ((late - early) / early) * 100 if early != 0 else 0
        arrow = "up" if pct > 0 else "down"
        return f"{arrow} {abs(pct):.0f}%"

    output_dir = OUTPUT_FILE.parent
    output_dir.mkdir(parents=True, exist_ok=True)

    report = f"""# Kibana AI Adoption Impact Study — Findings

**Repository:** elastic/kibana
**Period:** {s['date_range']}
**Generated from:** {s['total_commits']:,} commits, {s['total_prs']:,} PRs, {s['total_bug_issues']:,} bug issues

---

## Key Numbers

| Metric | Value |
|--------|-------|
| Total human commits | {s['total_commits']:,} |
| Total merged PRs | {s['total_prs']:,} |
| Total bug issues | {s['total_bug_issues']:,} |
| AI-assisted commits | {s['total_ai_commits']:,} ({fmt_pct(s['overall_ai_commit_rate'])}) |
| Overall PR cycle time (p50) | {fmt_hours(s['overall_pr_cycle_time']['p50'])} |
| Overall bug resolution (p50) | {fmt_hours(s['overall_bug_resolution_time']['p50'])} |

---

## Trends: Early Period vs Late Period

Comparing the first 3 months ({', '.join(early_months)}) to the last 3 months ({', '.join(late_months)}):

| Metric | Early | Late | Change |
|--------|-------|------|--------|
| PR cycle time (p50) | {fmt_hours(early_cycle)} | {fmt_hours(late_cycle)} | {trend_arrow(early_cycle, late_cycle)} |
| PR throughput/month | {early_throughput:.0f} | {late_throughput:.0f} | {trend_arrow(early_throughput, late_throughput)} |
| Bug issues/month | {early_bugs:.0f} | {late_bugs:.0f} | {trend_arrow(early_bugs, late_bugs)} |
| Bug resolution (p50) | {fmt_hours(early_resolution)} | {fmt_hours(late_resolution)} | {trend_arrow(early_resolution, late_resolution)} |
| AI commit rate | {fmt_pct(early_ai)} | {fmt_pct(late_ai)} | {trend_arrow(early_ai, late_ai)} |

---

## Charts

### Release Speed

![PR Cycle Time](charts/pr_cycle_time.png)

![PR Throughput](charts/pr_throughput.png)

![Commit Velocity](charts/commit_velocity.png)

![PR Size Trends](charts/pr_size_trends.png)

### Bugs

![Bug Volume](charts/bug_volume.png)

![Bug Severity Distribution](charts/bug_severity.png)

![Bug Resolution Time](charts/bug_resolution_time.png)

### AI Adoption

![AI Adoption Rate](charts/ai_adoption_rate.png)

![AI vs Non-AI Cycle Time](charts/ai_vs_non_ai_cycle_time.png)

### Correlation

![Correlation Overlay](charts/correlation_overlay.png)

---

## Methodology

- **Commit data:** Extracted from local git log (`git log --since=2024-10-01`)
- **PR data:** Fetched via GitHub Search API, filtered to merged PRs
- **Bug data:** GitHub issues with the `bug` label
- **AI signal detection:**
  - Commit-level: `Co-authored-by` trailers matching known AI tools (Copilot, Claude, etc.)
  - PR-level: Keywords in PR title/body (copilot, claude, ai-generated, etc.)
- **Bot filtering:** Commits from known bots (kibanamachine, renovate-bot, elasticmachine) excluded from human metrics

## Limitations

- AI adoption proxy signals are incomplete — many developers use AI tools without leaving co-author tags or keywords
- Correlation does not imply causation — many factors affect release speed and bug rates
- Bug severity analysis depends on label consistency, which varies across teams
- PR cycle time includes review wait time, which is a human process largely independent of AI
- The `bug` label may not capture all bugs (some may use team-specific labels)
- **Bug-to-total ratio** deferred to Phase C — requires fetching all issues (not just bugs) to compute the denominator
- **Bug reopen rate** deferred to Phase C — requires per-issue timeline events API calls, which is expensive at scale

## Next Steps

See [NEXT_STEPS.md](../NEXT_STEPS.md) for Phase C (Elasticsearch/Kibana pipeline) and other improvements.
"""

    with open(OUTPUT_FILE, "w") as f:
        f.write(report)

    print(f"Summary report written to {OUTPUT_FILE}")


if __name__ == "__main__":
    generate()
