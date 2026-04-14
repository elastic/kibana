#!/usr/bin/env python3
"""Generate an interactive HTML report from computed metrics and charts."""

import base64
import json
from pathlib import Path

METRICS_FILE = Path(__file__).parent / "data" / "metrics.json"
TEAM_METRICS_FILE = Path(__file__).parent / "data" / "team_metrics.json"
CHARTS_DIR = Path(__file__).parent / "output" / "charts"
OUTPUT_FILE = Path(__file__).parent / "output" / "report.html"


def embed_image(path: Path) -> str:
    if not path.exists():
        return ""
    data = base64.b64encode(path.read_bytes()).decode()
    return f"data:image/png;base64,{data}"


def fmt_hours(h) -> str:
    if h is None:
        return "N/A"
    if h < 24:
        return f"{h:.1f}h"
    return f"{h / 24:.1f}d"


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

    # Load team metrics
    team_data = {}
    if TEAM_METRICS_FILE.exists():
        with open(TEAM_METRICS_FILE) as f:
            team_data = json.load(f)

    # Embed static chart images
    chart_files = [
        ("pr_cycle_time", "PR Cycle Time"),
        ("pr_throughput", "PR Throughput"),
        ("commit_velocity", "Commit Velocity"),
        ("pr_size_trends", "PR Size Trends"),
        ("bug_volume", "Bug Volume"),
        ("bug_severity", "Bug Severity Distribution"),
        ("bug_resolution_time", "Bug Resolution Time"),
        ("ai_adoption_rate", "AI Adoption Rate"),
        ("ai_vs_non_ai_cycle_time", "AI vs Non-AI Cycle Time"),
        ("correlation_overlay", "Correlation Overlay"),
        ("defect_density", "Defect Density"),
        ("regression_trend", "Regression Trend"),
        ("test_coverage_proxy", "Test Coverage Proxy"),
        ("quality_score", "Quality Score"),
    ]
    chart_images = {}
    for fname, _ in chart_files:
        chart_images[fname] = embed_image(CHARTS_DIR / f"{fname}.png")

    # Trends
    early = months[:3]
    late = months[-3:]

    def avg_m(ml, key, sub=None):
        vals = []
        for m in ml:
            v = monthly[m].get(key)
            if sub and isinstance(v, dict):
                v = v.get(sub)
            if v is not None:
                vals.append(v)
        return sum(vals) / len(vals) if vals else None

    def trend(e, l):
        if e is None or l is None or e == 0:
            return ""
        pct = ((l - e) / e) * 100
        arrow = "\u2191" if pct > 0 else "\u2193"
        return f"{arrow} {abs(pct):.0f}%"

    early_cycle = avg_m(early, "pr_cycle_time", "p50")
    late_cycle = avg_m(late, "pr_cycle_time", "p50")
    early_tp = avg_m(early, "pr_throughput")
    late_tp = avg_m(late, "pr_throughput")
    early_bugs = avg_m(early, "bug_count")
    late_bugs = avg_m(late, "bug_count")
    early_res = avg_m(early, "bug_resolution_time", "p50")
    late_res = avg_m(late, "bug_resolution_time", "p50")
    early_ai = avg_m(early, "ai_commit_rate")
    late_ai = avg_m(late, "ai_commit_rate")

    # Build team HTML sections
    top_teams_rows = ""
    for t in team_data.get("top_teams", []):
        ct = t.get("pr_cycle_time", {})
        br = t.get("bug_resolution", {})
        top_teams_rows += f"""<tr>
          <td>{t['team']}</td>
          <td>{t['total_prs']:,}</td>
          <td>{t['total_bugs']:,}</td>
          <td>{t['total_ai_prs']}</td>
          <td class="{'trend-up' if t['ai_pr_rate'] > 0.03 else ''}">{t['ai_pr_rate']:.1%}</td>
          <td>{fmt_hours(ct.get('p50'))}</td>
          <td>{fmt_hours(br.get('p50'))}</td>
        </tr>"""

    sec_teams_rows = ""
    for t in team_data.get("security_teams", []):
        ct = t.get("pr_cycle_time", {})
        br = t.get("bug_resolution", {})
        sec_teams_rows += f"""<tr>
          <td>{t['team']}</td>
          <td>{t['total_prs']:,}</td>
          <td>{t['total_bugs']:,}</td>
          <td>{t['total_ai_prs']}</td>
          <td class="{'trend-up' if t['ai_pr_rate'] > 0.03 else ''}">{t['ai_pr_rate']:.1%}</td>
          <td>{fmt_hours(ct.get('p50'))}</td>
          <td>{fmt_hours(br.get('p50'))}</td>
        </tr>"""

    sc = team_data.get("security_code", {})
    sec_authors_rows = ""
    for a in sc.get("top_authors", []):
        sec_authors_rows += f"""<tr>
          <td>{a['author']}</td>
          <td>{a['commits']}</td>
          <td>{a['ai_commits']}</td>
          <td>{a['ai_commits']/a['commits']:.1%}</td>
        </tr>"""

    # Build security monthly data for interactive chart
    sec_monthly = sc.get("monthly", {})
    sec_team_monthly = {}
    for t in team_data.get("security_teams", []):
        sec_team_monthly[t["team"]] = t.get("monthly", {})
    team_chart_data = json.dumps({
        "security_code": sec_monthly,
        "security_teams": sec_team_monthly,
        "top_teams": {t["team"]: t.get("monthly", {}) for t in team_data.get("top_teams", [])},
    }, default=str)

    # Build metrics JSON for interactive charts
    metrics_json = json.dumps(metrics, default=str)

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Kibana AI Adoption Impact Study</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<style>
  :root {{
    --bg: #0f172a;
    --surface: #1e293b;
    --surface2: #334155;
    --text: #e2e8f0;
    --muted: #94a3b8;
    --accent: #3b82f6;
    --red: #e63946;
    --orange: #f4a261;
    --teal: #2dd4bf;
    --green: #22c55e;
    --border: #475569;
  }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
  }}
  h1 {{
    font-size: 2rem;
    margin-bottom: 0.25rem;
    background: linear-gradient(135deg, var(--accent), var(--teal));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }}
  .subtitle {{ color: var(--muted); margin-bottom: 2rem; font-size: 0.95rem; }}
  h2 {{
    font-size: 1.4rem;
    margin: 2.5rem 0 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border);
  }}
  h3 {{ font-size: 1.1rem; margin: 1.5rem 0 0.75rem; color: var(--muted); }}

  .kpi-grid {{
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin: 1.5rem 0;
  }}
  .kpi {{
    background: var(--surface);
    border-radius: 12px;
    padding: 1.25rem;
    border: 1px solid var(--border);
  }}
  .kpi-value {{
    font-size: 1.8rem;
    font-weight: 700;
    color: var(--accent);
  }}
  .kpi-value.highlight {{ color: var(--red); }}
  .kpi-label {{ font-size: 0.85rem; color: var(--muted); margin-top: 0.25rem; }}

  .trends-table {{
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
    background: var(--surface);
    border-radius: 12px;
    overflow: hidden;
  }}
  .trends-table th, .trends-table td {{
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid var(--border);
  }}
  .trends-table th {{ background: var(--surface2); color: var(--muted); font-size: 0.85rem; text-transform: uppercase; }}
  .trend-up {{ color: var(--green); }}
  .trend-down {{ color: var(--red); }}

  .chart-section {{
    background: var(--surface);
    border-radius: 12px;
    padding: 1.5rem;
    margin: 1.5rem 0;
    border: 1px solid var(--border);
  }}
  .chart-section img {{
    width: 100%;
    border-radius: 8px;
    margin: 0.5rem 0;
  }}
  .chart-grid {{
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(600px, 1fr));
    gap: 1.5rem;
  }}

  .correlation-builder {{
    background: var(--surface);
    border-radius: 12px;
    padding: 1.5rem;
    margin: 1.5rem 0;
    border: 2px solid var(--accent);
  }}
  .controls {{
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    align-items: center;
    margin-bottom: 1rem;
  }}
  .controls label {{ color: var(--muted); font-size: 0.9rem; }}
  .controls select {{
    background: var(--surface2);
    color: var(--text);
    border: 1px solid var(--border);
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    font-size: 0.9rem;
    cursor: pointer;
  }}
  .controls select:focus {{ outline: none; border-color: var(--accent); }}
  .chart-canvas-wrap {{
    position: relative;
    height: 400px;
    background: var(--surface2);
    border-radius: 8px;
    padding: 1rem;
  }}

  .methodology {{
    background: var(--surface);
    border-radius: 12px;
    padding: 1.5rem;
    margin: 1.5rem 0;
    border: 1px solid var(--border);
    font-size: 0.9rem;
  }}
  .methodology ul {{ margin-left: 1.5rem; color: var(--muted); }}
  .methodology li {{ margin: 0.4rem 0; }}
  .methodology strong {{ color: var(--text); }}
  .limitation {{ color: var(--orange); }}

  .tabs {{
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }}
  .tab {{
    padding: 0.5rem 1rem;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 8px;
    cursor: pointer;
    color: var(--muted);
    font-size: 0.9rem;
    transition: all 0.2s;
  }}
  .tab:hover {{ border-color: var(--accent); color: var(--text); }}
  .tab.active {{ background: var(--accent); color: white; border-color: var(--accent); }}
  .tab-content {{ display: none; }}
  .tab-content.active {{ display: block; }}

  footer {{ margin-top: 3rem; padding-top: 1rem; border-top: 1px solid var(--border); color: var(--muted); font-size: 0.8rem; text-align: center; }}
</style>
</head>
<body>

<h1>Kibana AI Adoption Impact Study</h1>
<p class="subtitle">elastic/kibana &middot; {s['date_range']} &middot; {s['total_commits']:,} commits &middot; {s['total_prs']:,} PRs &middot; {s['total_bug_issues']:,} bug issues</p>

<h2>Key Metrics</h2>
<div class="kpi-grid">
  <div class="kpi">
    <div class="kpi-value">{s['total_commits']:,}</div>
    <div class="kpi-label">Human Commits</div>
  </div>
  <div class="kpi">
    <div class="kpi-value highlight">{s['total_ai_commits']:,}</div>
    <div class="kpi-label">AI-Assisted Commits ({fmt_pct(s['overall_ai_commit_rate'])})</div>
  </div>
  <div class="kpi">
    <div class="kpi-value">{s['total_prs']:,}</div>
    <div class="kpi-label">Merged PRs</div>
  </div>
  <div class="kpi">
    <div class="kpi-value">{s['total_bug_issues']:,}</div>
    <div class="kpi-label">Bug Issues</div>
  </div>
  <div class="kpi">
    <div class="kpi-value">{fmt_hours(s['overall_pr_cycle_time']['p50'])}</div>
    <div class="kpi-label">Median PR Cycle Time</div>
  </div>
  <div class="kpi">
    <div class="kpi-value">{fmt_hours(s['overall_bug_resolution_time']['p50'])}</div>
    <div class="kpi-label">Median Bug Resolution</div>
  </div>
  <div class="kpi">
    <div class="kpi-value">{s.get('overall_defect_density', 0):.2f}</div>
    <div class="kpi-label">Defect Density (bugs/PR)</div>
  </div>
  <div class="kpi">
    <div class="kpi-value">{s.get('overall_regression_count', 0)}</div>
    <div class="kpi-label">Regressions ({fmt_pct(s.get('overall_regression_rate', 0))} of bugs)</div>
  </div>
</div>

<h2>Trends: Early vs Late Period</h2>
<table class="trends-table">
  <thead>
    <tr><th>Metric</th><th>Early ({', '.join(early)})</th><th>Late ({', '.join(late)})</th><th>Change</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>AI commit rate</td>
      <td>{fmt_pct(early_ai)}</td>
      <td>{fmt_pct(late_ai)}</td>
      <td class="trend-up">{trend(early_ai, late_ai)}</td>
    </tr>
    <tr>
      <td>Commit count/month</td>
      <td>{avg_m(early, 'commit_count'):.0f}</td>
      <td>{avg_m(late, 'commit_count'):.0f}</td>
      <td class="{('trend-up' if avg_m(late, 'commit_count') > avg_m(early, 'commit_count') else 'trend-down')}">{trend(avg_m(early, 'commit_count'), avg_m(late, 'commit_count'))}</td>
    </tr>
    <tr>
      <td>Unique authors/month</td>
      <td>{avg_m(early, 'unique_authors'):.0f}</td>
      <td>{avg_m(late, 'unique_authors'):.0f}</td>
      <td class="{('trend-up' if avg_m(late, 'unique_authors') > avg_m(early, 'unique_authors') else 'trend-down')}">{trend(avg_m(early, 'unique_authors'), avg_m(late, 'unique_authors'))}</td>
    </tr>
    <tr>
      <td>Commits per author</td>
      <td>{avg_m(early, 'commits_per_author'):.1f}</td>
      <td>{avg_m(late, 'commits_per_author'):.1f}</td>
      <td class="{('trend-up' if avg_m(late, 'commits_per_author') > avg_m(early, 'commits_per_author') else 'trend-down')}">{trend(avg_m(early, 'commits_per_author'), avg_m(late, 'commits_per_author'))}</td>
    </tr>
    <tr>
      <td>Avg lines changed/PR</td>
      <td>{avg_m(early, 'avg_pr_lines_changed'):.0f}</td>
      <td>{avg_m(late, 'avg_pr_lines_changed'):.0f}</td>
      <td class="{('trend-up' if avg_m(late, 'avg_pr_lines_changed') > avg_m(early, 'avg_pr_lines_changed') else 'trend-down')}">{trend(avg_m(early, 'avg_pr_lines_changed'), avg_m(late, 'avg_pr_lines_changed'))}</td>
    </tr>
    <tr>
      <td>Defect density (bugs/PR)</td>
      <td>{avg_m(early, 'defect_density'):.3f}</td>
      <td>{avg_m(late, 'defect_density'):.3f}</td>
      <td class="{{('trend-down' if avg_m(late, 'defect_density') < avg_m(early, 'defect_density') else 'trend-up')}}">{trend(avg_m(early, 'defect_density'), avg_m(late, 'defect_density'))}</td>
    </tr>
    <tr>
      <td>Regression rate</td>
      <td>{fmt_pct(avg_m(early, 'regression_rate'))}</td>
      <td>{fmt_pct(avg_m(late, 'regression_rate'))}</td>
      <td class="{{('trend-down' if avg_m(late, 'regression_rate') < avg_m(early, 'regression_rate') else 'trend-up')}}">{trend(avg_m(early, 'regression_rate'), avg_m(late, 'regression_rate'))}</td>
    </tr>
    <tr>
      <td>Test-to-prod ratio</td>
      <td>{avg_m(early, 'test_to_prod_ratio'):.3f}</td>
      <td>{avg_m(late, 'test_to_prod_ratio'):.3f}</td>
      <td class="{{('trend-up' if avg_m(late, 'test_to_prod_ratio') > avg_m(early, 'test_to_prod_ratio') else 'trend-down')}}">{trend(avg_m(early, 'test_to_prod_ratio'), avg_m(late, 'test_to_prod_ratio'))}</td>
    </tr>
  </tbody>
</table>

<h2>Interactive Correlation Explorer</h2>
<div class="correlation-builder">
  <div class="controls">
    <label>Left axis (line):</label>
    <select id="leftMetric">
      <option value="ai_commit_rate" selected>AI Commit Rate (%)</option>
      <option value="ai_commit_count">AI Commit Count</option>
      <option value="commit_count">Total Commits</option>
      <option value="unique_authors">Unique Authors</option>
      <option value="commits_per_author">Commits per Author</option>
      <option value="avg_pr_lines_changed">Avg Lines Changed</option>
      <option value="defect_density">Defect Density</option>
      <option value="regression_count">Regression Count</option>
      <option value="regression_rate">Regression Rate</option>
      <option value="quality_score">Quality Score</option>
      <option value="test_to_prod_ratio">Test-to-Prod Ratio</option>
    </select>
    <label>Right axis (line):</label>
    <select id="rightMetric">
      <option value="bug_count">Bug Count</option>
      <option value="commit_count" selected>Total Commits</option>
      <option value="unique_authors">Unique Authors</option>
      <option value="ai_commit_count">AI Commit Count</option>
      <option value="avg_pr_lines_changed">Avg Lines Changed</option>
      <option value="commits_per_author">Commits per Author</option>
      <option value="defect_density">Defect Density</option>
      <option value="regression_count">Regression Count</option>
      <option value="regression_rate">Regression Rate</option>
      <option value="quality_score">Quality Score</option>
      <option value="test_to_prod_ratio">Test-to-Prod Ratio</option>
    </select>
    <label>Overlay (bars):</label>
    <select id="barMetric">
      <option value="none" selected>None</option>
      <option value="ai_commit_count">AI Commit Count</option>
      <option value="bug_count">Bug Count</option>
      <option value="commit_count">Total Commits</option>
      <option value="unique_authors">Unique Authors</option>
      <option value="defect_density">Defect Density</option>
      <option value="regression_count">Regression Count</option>
      <option value="regression_rate">Regression Rate</option>
      <option value="quality_score">Quality Score</option>
      <option value="test_to_prod_ratio">Test-to-Prod Ratio</option>
    </select>
  </div>
  <div class="chart-canvas-wrap">
    <canvas id="correlationChart"></canvas>
  </div>
</div>

<h2>Static Charts</h2>
<div class="tabs" id="chartTabs">
  <div class="tab active" data-tab="speed">Release Speed</div>
  <div class="tab" data-tab="bugs">Bugs</div>
  <div class="tab" data-tab="ai">AI Adoption</div>
  <div class="tab" data-tab="corr">Correlation</div>
  <div class="tab" data-tab="quality">Quality</div>
</div>

<div class="tab-content active" id="tab-speed">
  <div class="chart-grid">
    <div class="chart-section"><h3>PR Cycle Time</h3><img src="{chart_images.get('pr_cycle_time', '')}" alt="PR Cycle Time"></div>
    <div class="chart-section"><h3>PR Throughput</h3><img src="{chart_images.get('pr_throughput', '')}" alt="PR Throughput"></div>
    <div class="chart-section"><h3>Commit Velocity</h3><img src="{chart_images.get('commit_velocity', '')}" alt="Commit Velocity"></div>
    <div class="chart-section"><h3>PR Size Trends</h3><img src="{chart_images.get('pr_size_trends', '')}" alt="PR Size Trends"></div>
  </div>
</div>
<div class="tab-content" id="tab-bugs">
  <div class="chart-grid">
    <div class="chart-section"><h3>Bug Volume</h3><img src="{chart_images.get('bug_volume', '')}" alt="Bug Volume"></div>
    <div class="chart-section"><h3>Bug Severity Distribution</h3><img src="{chart_images.get('bug_severity', '')}" alt="Bug Severity"></div>
    <div class="chart-section"><h3>Bug Resolution Time</h3><img src="{chart_images.get('bug_resolution_time', '')}" alt="Bug Resolution Time"></div>
  </div>
</div>
<div class="tab-content" id="tab-ai">
  <div class="chart-grid">
    <div class="chart-section"><h3>AI Adoption Rate</h3><img src="{chart_images.get('ai_adoption_rate', '')}" alt="AI Adoption Rate"></div>
    <div class="chart-section"><h3>AI vs Non-AI Cycle Time</h3><img src="{chart_images.get('ai_vs_non_ai_cycle_time', '')}" alt="AI vs Non-AI Cycle Time"></div>
  </div>
</div>
<div class="tab-content" id="tab-corr">
  <div class="chart-grid">
    <div class="chart-section"><h3>Correlation Overlay</h3><img src="{chart_images.get('correlation_overlay', '')}" alt="Correlation Overlay"></div>
  </div>
</div>
<div class="tab-content" id="tab-quality">
  <div class="chart-grid">
    <div class="chart-section"><h3>Defect Density</h3><img src="{chart_images.get('defect_density', '')}" alt="Defect Density"></div>
    <div class="chart-section"><h3>Regression Trend</h3><img src="{chart_images.get('regression_trend', '')}" alt="Regression Trend"></div>
    <div class="chart-section"><h3>Test Coverage Proxy</h3><img src="{chart_images.get('test_coverage_proxy', '')}" alt="Test Coverage Proxy"></div>
    <div class="chart-section"><h3>Quality Score</h3><img src="{chart_images.get('quality_score', '')}" alt="Quality Score"></div>
  </div>
</div>

<h2>Team Analysis</h2>
<h3>Top 20 Teams by Activity</h3>
<div style="overflow-x:auto">
<table class="trends-table">
  <thead><tr><th>Team</th><th>PRs</th><th>Bugs</th><th>AI PRs</th><th>AI Rate</th><th>PR Cycle (p50)</th><th>Bug Resolve (p50)</th></tr></thead>
  <tbody>{top_teams_rows}</tbody>
</table>
</div>

<h2>Security Deep-Dive</h2>

<div class="kpi-grid">
  <div class="kpi">
    <div class="kpi-value">{sc.get('total_commits', 0):,}</div>
    <div class="kpi-label">Security Code Commits</div>
  </div>
  <div class="kpi">
    <div class="kpi-value highlight">{sc.get('total_ai_commits', 0)}</div>
    <div class="kpi-label">AI-Assisted ({sc.get('ai_rate', 0):.1%})</div>
  </div>
  <div class="kpi">
    <div class="kpi-value">{sc.get('unique_authors', 0)}</div>
    <div class="kpi-label">Unique Authors</div>
  </div>
  <div class="kpi">
    <div class="kpi-value">{sum(t['total_bugs'] for t in team_data.get('security_teams', [])):,}</div>
    <div class="kpi-label">Security Bug Issues</div>
  </div>
</div>

<h3>Security Teams Breakdown</h3>
<div style="overflow-x:auto">
<table class="trends-table">
  <thead><tr><th>Team</th><th>PRs</th><th>Bugs</th><th>AI PRs</th><th>AI Rate</th><th>PR Cycle (p50)</th><th>Bug Resolve (p50)</th></tr></thead>
  <tbody>{sec_teams_rows}</tbody>
</table>
</div>

<h3>Security Code: Top Contributors</h3>
<div style="overflow-x:auto">
<table class="trends-table">
  <thead><tr><th>Author</th><th>Commits</th><th>AI Commits</th><th>AI Rate</th></tr></thead>
  <tbody>{sec_authors_rows}</tbody>
</table>
</div>

<h3>Security: AI Adoption & Bugs Over Time</h3>
<div class="correlation-builder">
  <div class="controls">
    <label>Security metric:</label>
    <select id="secLeftMetric">
      <option value="ai_rate" selected>AI Commit Rate (%)</option>
      <option value="ai_commit_count">AI Commit Count</option>
      <option value="commit_count">Total Commits</option>
      <option value="unique_authors">Unique Authors</option>
    </select>
    <label>Compare with:</label>
    <select id="secRightMetric">
      <option value="bug_count" selected>Security Bug Count (all teams)</option>
      <option value="pr_count">Security PR Count (all teams)</option>
    </select>
  </div>
  <div class="chart-canvas-wrap">
    <canvas id="securityChart"></canvas>
  </div>
</div>

<h2>Methodology</h2>
<div class="methodology">
  <ul>
    <li><strong>Commit data:</strong> Extracted from local git log (<code>git log --since=2024-10-01</code>) &mdash; complete across all 19 months</li>
    <li><strong>PR data:</strong> Fetched via GitHub Search API, filtered to merged PRs &mdash; <span class="limitation">limited to first 3 months due to API caps</span></li>
    <li><strong>Bug data:</strong> GitHub issues with the <code>bug</code> label &mdash; <span class="limitation">same API limitation as PRs</span></li>
    <li><strong>AI signal detection:</strong>
      <ul>
        <li>Commit-level: <code>Co-authored-by</code> trailers matching AI tools (Copilot, Claude, etc.)</li>
        <li>PR-level: Keywords in PR title/body (copilot, claude, ai-generated, etc.)</li>
      </ul>
    </li>
    <li><strong>Bot filtering:</strong> Commits from kibanamachine, renovate-bot, elasticmachine excluded from human metrics</li>
  </ul>
</div>

<h2>Limitations</h2>
<div class="methodology">
  <ul>
    <li>AI adoption proxy signals are incomplete &mdash; many developers use AI tools without leaving co-author tags</li>
    <li>Correlation does not imply causation &mdash; many factors affect release speed and bug rates</li>
    <li class="limitation">PR and bug issue data only covers Oct&ndash;Dec 2024 due to GitHub Search API result caps. Commit-based metrics are complete.</li>
    <li><strong>Bug-to-total ratio</strong> and <strong>bug reopen rate</strong> deferred to Phase C</li>
  </ul>
</div>

<footer>
  Generated on {__import__('datetime').date.today().isoformat()} &middot; Kibana AI Adoption Impact Study &middot;
  <a href="https://github.com/elastic/kibana" style="color:var(--accent)">elastic/kibana</a>
</footer>

<script>
const METRICS = {metrics_json};
const months = Object.keys(METRICS.monthly).sort();

const METRIC_LABELS = {{
  ai_commit_rate: 'AI Commit Rate (%)',
  ai_commit_count: 'AI Commit Count',
  commit_count: 'Total Commits',
  unique_authors: 'Unique Authors',
  commits_per_author: 'Commits per Author',
  avg_pr_lines_changed: 'Avg Lines Changed',
  bug_count: 'Bug Count',
  defect_density: 'Defect Density (bugs/PR)',
  regression_count: 'Regression Count',
  regression_rate: 'Regression Rate',
  quality_score: 'Quality Score',
  test_to_prod_ratio: 'Test-to-Prod Ratio',
  test_line_ratio: 'Test Line Ratio',
}};

const COLORS = {{
  left: '#3b82f6',
  right: '#e63946',
  bar: 'rgba(45, 212, 191, 0.4)',
  barBorder: '#2dd4bf',
}};

function getValues(key) {{
  return months.map(m => {{
    let v = METRICS.monthly[m][key];
    if (key === 'ai_commit_rate' || key === 'regression_rate') v = (v || 0) * 100;
    return v ?? 0;
  }});
}}

let chart = null;

function buildChart() {{
  const leftKey = document.getElementById('leftMetric').value;
  const rightKey = document.getElementById('rightMetric').value;
  const barKey = document.getElementById('barMetric').value;

  const leftData = getValues(leftKey);
  const rightData = getValues(rightKey);

  const datasets = [
    {{
      label: METRIC_LABELS[leftKey],
      data: leftData,
      borderColor: COLORS.left,
      backgroundColor: COLORS.left,
      yAxisID: 'yLeft',
      type: 'line',
      tension: 0.3,
      pointRadius: 4,
      borderWidth: 2,
      order: 1,
    }},
    {{
      label: METRIC_LABELS[rightKey],
      data: rightData,
      borderColor: COLORS.right,
      backgroundColor: COLORS.right,
      yAxisID: 'yRight',
      type: 'line',
      tension: 0.3,
      pointRadius: 4,
      borderWidth: 2,
      order: 2,
    }},
  ];

  if (barKey !== 'none') {{
    datasets.push({{
      label: METRIC_LABELS[barKey],
      data: getValues(barKey),
      backgroundColor: COLORS.bar,
      borderColor: COLORS.barBorder,
      borderWidth: 1,
      yAxisID: 'yBar',
      type: 'bar',
      order: 3,
    }});
  }}

  if (chart) chart.destroy();

  chart = new Chart(document.getElementById('correlationChart'), {{
    type: 'line',
    data: {{ labels: months, datasets }},
    options: {{
      responsive: true,
      maintainAspectRatio: false,
      interaction: {{ mode: 'index', intersect: false }},
      plugins: {{
        legend: {{
          labels: {{ color: '#e2e8f0', padding: 16 }},
        }},
        tooltip: {{
          backgroundColor: '#1e293b',
          titleColor: '#e2e8f0',
          bodyColor: '#94a3b8',
          borderColor: '#475569',
          borderWidth: 1,
        }},
      }},
      scales: {{
        x: {{
          ticks: {{ color: '#94a3b8', maxRotation: 45 }},
          grid: {{ color: '#334155' }},
        }},
        yLeft: {{
          type: 'linear',
          position: 'left',
          title: {{ display: true, text: METRIC_LABELS[leftKey], color: COLORS.left }},
          ticks: {{ color: COLORS.left }},
          grid: {{ color: '#334155' }},
        }},
        yRight: {{
          type: 'linear',
          position: 'right',
          title: {{ display: true, text: METRIC_LABELS[rightKey], color: COLORS.right }},
          ticks: {{ color: COLORS.right }},
          grid: {{ drawOnChartArea: false }},
        }},
        ...(barKey !== 'none' ? {{
          yBar: {{
            type: 'linear',
            display: false,
          }}
        }} : {{}}),
      }},
    }},
  }});
}}

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {{
  tab.addEventListener('click', () => {{
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  }});
}});

// Correlation controls
document.getElementById('leftMetric').addEventListener('change', buildChart);
document.getElementById('rightMetric').addEventListener('change', buildChart);
document.getElementById('barMetric').addEventListener('change', buildChart);

// Initial render
buildChart();

// --- Security Chart ---
const TEAM_DATA = {team_chart_data};
const secCode = TEAM_DATA.security_code;
const secTeams = TEAM_DATA.security_teams;
const secMonths = Object.keys(secCode).sort();

function getSecCodeValues(key) {{
  return secMonths.map(m => {{
    let v = secCode[m]?.[key] ?? 0;
    if (key === 'ai_rate') v = (v || 0) * 100;
    return v;
  }});
}}

function getSecTeamAgg(key) {{
  return secMonths.map(m => {{
    let total = 0;
    for (const [team, data] of Object.entries(secTeams)) {{
      total += data[m]?.[key] ?? 0;
    }}
    return total;
  }});
}}

let secChart = null;

function buildSecurityChart() {{
  const leftKey = document.getElementById('secLeftMetric').value;
  const rightKey = document.getElementById('secRightMetric').value;

  const leftData = getSecCodeValues(leftKey);
  const rightData = getSecTeamAgg(rightKey);

  const leftLabels = {{
    ai_rate: 'Security AI Rate (%)',
    ai_commit_count: 'Security AI Commits',
    commit_count: 'Security Commits',
    unique_authors: 'Security Authors',
  }};
  const rightLabels = {{
    bug_count: 'Security Bugs (all teams)',
    pr_count: 'Security PRs (all teams)',
  }};

  if (secChart) secChart.destroy();

  secChart = new Chart(document.getElementById('securityChart'), {{
    type: 'line',
    data: {{
      labels: secMonths,
      datasets: [
        {{
          label: leftLabels[leftKey],
          data: leftData,
          borderColor: '#3b82f6',
          backgroundColor: '#3b82f6',
          yAxisID: 'yLeft',
          tension: 0.3,
          pointRadius: 4,
          borderWidth: 2,
          order: 1,
        }},
        {{
          label: rightLabels[rightKey],
          data: rightData,
          backgroundColor: 'rgba(230, 57, 70, 0.3)',
          borderColor: '#e63946',
          borderWidth: 1,
          yAxisID: 'yRight',
          type: 'bar',
          order: 2,
        }},
      ],
    }},
    options: {{
      responsive: true,
      maintainAspectRatio: false,
      interaction: {{ mode: 'index', intersect: false }},
      plugins: {{
        legend: {{ labels: {{ color: '#e2e8f0', padding: 16 }} }},
        tooltip: {{
          backgroundColor: '#1e293b',
          titleColor: '#e2e8f0',
          bodyColor: '#94a3b8',
          borderColor: '#475569',
          borderWidth: 1,
        }},
      }},
      scales: {{
        x: {{
          ticks: {{ color: '#94a3b8', maxRotation: 45 }},
          grid: {{ color: '#334155' }},
        }},
        yLeft: {{
          type: 'linear',
          position: 'left',
          title: {{ display: true, text: leftLabels[leftKey], color: '#3b82f6' }},
          ticks: {{ color: '#3b82f6' }},
          grid: {{ color: '#334155' }},
        }},
        yRight: {{
          type: 'linear',
          position: 'right',
          title: {{ display: true, text: rightLabels[rightKey], color: '#e63946' }},
          ticks: {{ color: '#e63946' }},
          grid: {{ drawOnChartArea: false }},
        }},
      }},
    }},
  }});
}}

document.getElementById('secLeftMetric').addEventListener('change', buildSecurityChart);
document.getElementById('secRightMetric').addEventListener('change', buildSecurityChart);
buildSecurityChart();
</script>

</body>
</html>"""

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w") as f:
        f.write(html)

    size_kb = OUTPUT_FILE.stat().st_size / 1024
    print(f"HTML report written to {OUTPUT_FILE} ({size_kb:.0f} KB)")


if __name__ == "__main__":
    generate()
