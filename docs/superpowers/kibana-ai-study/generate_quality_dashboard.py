#!/usr/bin/env python3
"""Generate a standalone quality dashboard HTML focused on the 4 quality pillars."""

import base64
import json
from pathlib import Path

METRICS_FILE = Path(__file__).parent / "data" / "metrics.json"
TEAM_METRICS_FILE = Path(__file__).parent / "data" / "team_metrics.json"
TEST_COVERAGE_FILE = Path(__file__).parent / "data" / "test_coverage_proxy.json"
CHARTS_DIR = Path(__file__).parent / "output" / "charts"
OUTPUT_FILE = Path(__file__).parent / "output" / "quality_dashboard.html"


def embed_image(path: Path) -> str:
    if not path.exists():
        return ""
    data = base64.b64encode(path.read_bytes()).decode()
    return f"data:image/png;base64,{data}"


def fmt_pct(rate) -> str:
    if rate is None:
        return "N/A"
    return f"{rate * 100:.1f}%"


def generate():
    with open(METRICS_FILE) as f:
        metrics = json.load(f)

    test_coverage = {}
    if TEST_COVERAGE_FILE.exists():
        with open(TEST_COVERAGE_FILE) as f:
            test_coverage = json.load(f)

    team_data = {}
    if TEAM_METRICS_FILE.exists():
        with open(TEAM_METRICS_FILE) as f:
            team_data = json.load(f)

    s = metrics["summary"]
    monthly = metrics["monthly"]
    months = sorted(monthly.keys())

    # Early vs late
    early = months[:3]
    late = months[-3:]

    def avg_m(ml, key):
        vals = [monthly[m].get(key, 0) for m in ml]
        vals = [v for v in vals if v is not None]
        return sum(vals) / len(vals) if vals else 0

    def avg_tc(ml, key):
        vals = [test_coverage.get(m, {}).get(key, 0) for m in ml]
        vals = [v for v in vals if v is not None]
        return sum(vals) / len(vals) if vals else 0

    def trend_arrow(early_val, late_val):
        if early_val == 0:
            return ""
        pct = ((late_val - early_val) / early_val) * 100
        arrow = "\u2191" if pct > 0 else "\u2193"
        cls = "trend-up" if pct > 0 else "trend-down"
        return f'<span class="{cls}">{arrow} {abs(pct):.0f}%</span>'

    # KPI values
    test_ratio_early = avg_tc(early, "test_to_prod_ratio")
    test_ratio_late = avg_tc(late, "test_to_prod_ratio")
    ai_rate_early = avg_m(early, "ai_commit_rate")
    ai_rate_late = avg_m(late, "ai_commit_rate")
    reg_rate_early = avg_m(early, "regression_rate")
    reg_rate_late = avg_m(late, "regression_rate")

    # Embed chart images
    chart_images = {}
    for name in ["test_coverage_proxy", "ai_adoption_rate", "regression_trend",
                  "defect_density", "quality_score"]:
        chart_images[name] = embed_image(CHARTS_DIR / f"{name}.png")

    # Team AI rates for adoption section
    team_rows = ""
    for t in team_data.get("top_teams", [])[:15]:
        team_rows += f"""<tr>
          <td>{t['team']}</td>
          <td>{t['total_prs']:,}</td>
          <td class="{'trend-up' if t['ai_pr_rate'] > 0.03 else ''}">{t['ai_pr_rate']:.1%}</td>
          <td>{t.get('defect_density', 0):.3f}</td>
          <td>{t.get('regression_count', 0)}</td>
        </tr>"""

    metrics_json = json.dumps(metrics, default=str)
    tc_json = json.dumps(test_coverage, default=str)

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Kibana Quality Dashboard</title>
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

  .pillar-grid {{
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin: 1.5rem 0;
  }}
  .pillar {{
    background: var(--surface);
    border-radius: 12px;
    padding: 1.5rem;
    border: 1px solid var(--border);
    text-align: center;
  }}
  .pillar-icon {{ font-size: 1.5rem; margin-bottom: 0.5rem; }}
  .pillar-value {{
    font-size: 2rem;
    font-weight: 700;
    color: var(--accent);
  }}
  .pillar-label {{ font-size: 0.85rem; color: var(--muted); margin-top: 0.25rem; }}
  .pillar-trend {{ font-size: 0.85rem; margin-top: 0.5rem; }}
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
  .chart-canvas-wrap {{
    position: relative;
    height: 400px;
    background: var(--surface2);
    border-radius: 8px;
    padding: 1rem;
  }}

  .placeholder {{
    background: var(--surface);
    border: 2px dashed var(--border);
    border-radius: 12px;
    padding: 2rem;
    text-align: center;
    color: var(--muted);
    margin: 1.5rem 0;
  }}
  .placeholder strong {{ color: var(--orange); }}

  table {{
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
    background: var(--surface);
    border-radius: 12px;
    overflow: hidden;
  }}
  th, td {{
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid var(--border);
  }}
  th {{ background: var(--surface2); color: var(--muted); font-size: 0.85rem; text-transform: uppercase; }}

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

  footer {{ margin-top: 3rem; padding-top: 1rem; border-top: 1px solid var(--border); color: var(--muted); font-size: 0.8rem; text-align: center; }}

  @media (max-width: 900px) {{
    .pillar-grid {{ grid-template-columns: repeat(2, 1fr); }}
  }}
</style>
</head>
<body>

<h1>Kibana Quality Dashboard</h1>
<p class="subtitle">elastic/kibana &middot; {s['date_range']} &middot; 4 Quality Pillars</p>

<div class="pillar-grid">
  <div class="pillar">
    <div class="pillar-value">{test_ratio_late:.2f}</div>
    <div class="pillar-label">Test-to-Prod Ratio (latest)</div>
    <div class="pillar-trend">{trend_arrow(test_ratio_early, test_ratio_late)}</div>
  </div>
  <div class="pillar">
    <div class="pillar-value">{fmt_pct(ai_rate_late)}</div>
    <div class="pillar-label">AI Adoption Rate (latest)</div>
    <div class="pillar-trend">{trend_arrow(ai_rate_early, ai_rate_late)}</div>
  </div>
  <div class="pillar">
    <div class="pillar-value">--</div>
    <div class="pillar-label">Synthetics Health</div>
    <div class="pillar-trend" style="color:var(--orange)">Pending data source</div>
  </div>
  <div class="pillar">
    <div class="pillar-value">{fmt_pct(reg_rate_late)}</div>
    <div class="pillar-label">Regression Rate (latest)</div>
    <div class="pillar-trend">{trend_arrow(reg_rate_early, reg_rate_late)}</div>
  </div>
</div>

<h2>1. Coverage Trends</h2>
<div class="chart-grid">
  <div class="chart-section">
    <h3>Test Investment Over Time</h3>
    <img src="{chart_images.get('test_coverage_proxy', '')}" alt="Test Coverage Proxy">
  </div>
</div>
<div class="chart-section">
  <h3>Interactive: Test vs Production Changes</h3>
  <div class="controls">
    <label>Metric:</label>
    <select id="tcMetric">
      <option value="test_to_prod_ratio" selected>Test-to-Prod File Ratio</option>
      <option value="test_line_ratio">Test-to-Prod Line Ratio</option>
      <option value="test_files_changed">Test Files Changed</option>
      <option value="prod_files_changed">Prod Files Changed</option>
      <option value="new_test_files">New Test Files</option>
    </select>
  </div>
  <div class="chart-canvas-wrap">
    <canvas id="coverageChart"></canvas>
  </div>
</div>

<h2>2. Tool Adoption</h2>
<div class="chart-grid">
  <div class="chart-section">
    <h3>AI Adoption Rate</h3>
    <img src="{chart_images.get('ai_adoption_rate', '')}" alt="AI Adoption Rate">
  </div>
</div>
<h3>Team AI Adoption &amp; Quality</h3>
<div style="overflow-x:auto">
<table>
  <thead><tr><th>Team</th><th>PRs</th><th>AI Rate</th><th>Defect Density</th><th>Regressions</th></tr></thead>
  <tbody>{team_rows}</tbody>
</table>
</div>

<h2>3. Synthetics Health</h2>
<div class="placeholder">
  <strong>Pending Integration</strong><br>
  Synthetics health data requires access to Elastic Observability APIs.<br>
  This section will show synthetic monitor success rates, response times, and journey health once connected.
</div>

<h2>4. Escaped Bug Rates</h2>
<div class="chart-grid">
  <div class="chart-section">
    <h3>Regression Trend</h3>
    <img src="{chart_images.get('regression_trend', '')}" alt="Regression Trend">
  </div>
  <div class="chart-section">
    <h3>Defect Density</h3>
    <img src="{chart_images.get('defect_density', '')}" alt="Defect Density">
  </div>
</div>
<div class="chart-section">
  <h3>Interactive: Quality Metrics Correlation</h3>
  <div class="controls">
    <label>Left axis:</label>
    <select id="qLeftMetric">
      <option value="regression_rate" selected>Regression Rate (%)</option>
      <option value="defect_density">Defect Density</option>
      <option value="quality_score">Quality Score</option>
      <option value="regression_count">Regression Count</option>
    </select>
    <label>Right axis:</label>
    <select id="qRightMetric">
      <option value="ai_commit_rate" selected>AI Adoption Rate (%)</option>
      <option value="pr_throughput">PR Throughput</option>
      <option value="bug_count">Bug Count</option>
      <option value="test_to_prod_ratio">Test-to-Prod Ratio</option>
    </select>
  </div>
  <div class="chart-canvas-wrap">
    <canvas id="qualityChart"></canvas>
  </div>
</div>

<div class="chart-grid">
  <div class="chart-section">
    <h3>Quality Score</h3>
    <img src="{chart_images.get('quality_score', '')}" alt="Quality Score">
  </div>
</div>

<footer>
  Generated on {__import__('datetime').date.today().isoformat()} &middot; Kibana Quality Dashboard &middot;
  <a href="https://github.com/elastic/kibana" style="color:var(--accent)">elastic/kibana</a>
</footer>

<script>
const METRICS = {metrics_json};
const TC = {tc_json};
const months = Object.keys(METRICS.monthly).sort();
const tcMonths = Object.keys(TC).sort();

const COLORS = {{
  left: '#3b82f6',
  right: '#e63946',
  bar: 'rgba(45, 212, 191, 0.4)',
}};

// --- Coverage Chart ---
let coverageChart = null;
function buildCoverageChart() {{
  const key = document.getElementById('tcMetric').value;
  const data = tcMonths.map(m => TC[m]?.[key] ?? 0);
  const labels = {{
    test_to_prod_ratio: 'Test-to-Prod File Ratio',
    test_line_ratio: 'Test-to-Prod Line Ratio',
    test_files_changed: 'Test Files Changed',
    prod_files_changed: 'Prod Files Changed',
    new_test_files: 'New Test Files',
  }};

  if (coverageChart) coverageChart.destroy();
  coverageChart = new Chart(document.getElementById('coverageChart'), {{
    type: key.includes('ratio') ? 'line' : 'bar',
    data: {{
      labels: tcMonths,
      datasets: [{{
        label: labels[key],
        data: data,
        borderColor: COLORS.left,
        backgroundColor: key.includes('ratio') ? COLORS.left : COLORS.bar,
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 4,
      }}],
    }},
    options: {{
      responsive: true,
      maintainAspectRatio: false,
      plugins: {{
        legend: {{ labels: {{ color: '#e2e8f0' }} }},
        tooltip: {{ backgroundColor: '#1e293b', titleColor: '#e2e8f0', bodyColor: '#94a3b8', borderColor: '#475569', borderWidth: 1 }},
      }},
      scales: {{
        x: {{ ticks: {{ color: '#94a3b8', maxRotation: 45 }}, grid: {{ color: '#334155' }} }},
        y: {{ ticks: {{ color: '#94a3b8' }}, grid: {{ color: '#334155' }} }},
      }},
    }},
  }});
}}
document.getElementById('tcMetric').addEventListener('change', buildCoverageChart);
buildCoverageChart();

// --- Quality Correlation Chart ---
function getQualityValues(key) {{
  return months.map(m => {{
    let v = METRICS.monthly[m][key];
    if (key === 'ai_commit_rate' || key === 'regression_rate') v = (v || 0) * 100;
    return v ?? 0;
  }});
}}

let qualityChart = null;
function buildQualityChart() {{
  const leftKey = document.getElementById('qLeftMetric').value;
  const rightKey = document.getElementById('qRightMetric').value;
  const leftData = getQualityValues(leftKey);
  const rightData = getQualityValues(rightKey);
  const labelMap = {{
    regression_rate: 'Regression Rate (%)',
    defect_density: 'Defect Density',
    quality_score: 'Quality Score',
    regression_count: 'Regression Count',
    ai_commit_rate: 'AI Adoption Rate (%)',
    pr_throughput: 'PR Throughput',
    bug_count: 'Bug Count',
    test_to_prod_ratio: 'Test-to-Prod Ratio',
  }};

  if (qualityChart) qualityChart.destroy();
  qualityChart = new Chart(document.getElementById('qualityChart'), {{
    type: 'line',
    data: {{
      labels: months,
      datasets: [
        {{ label: labelMap[leftKey], data: leftData, borderColor: COLORS.left, backgroundColor: COLORS.left, yAxisID: 'yLeft', tension: 0.3, pointRadius: 4, borderWidth: 2 }},
        {{ label: labelMap[rightKey], data: rightData, borderColor: COLORS.right, backgroundColor: COLORS.right, yAxisID: 'yRight', tension: 0.3, pointRadius: 4, borderWidth: 2 }},
      ],
    }},
    options: {{
      responsive: true,
      maintainAspectRatio: false,
      interaction: {{ mode: 'index', intersect: false }},
      plugins: {{
        legend: {{ labels: {{ color: '#e2e8f0', padding: 16 }} }},
        tooltip: {{ backgroundColor: '#1e293b', titleColor: '#e2e8f0', bodyColor: '#94a3b8', borderColor: '#475569', borderWidth: 1 }},
      }},
      scales: {{
        x: {{ ticks: {{ color: '#94a3b8', maxRotation: 45 }}, grid: {{ color: '#334155' }} }},
        yLeft: {{ type: 'linear', position: 'left', title: {{ display: true, text: labelMap[leftKey], color: COLORS.left }}, ticks: {{ color: COLORS.left }}, grid: {{ color: '#334155' }} }},
        yRight: {{ type: 'linear', position: 'right', title: {{ display: true, text: labelMap[rightKey], color: COLORS.right }}, ticks: {{ color: COLORS.right }}, grid: {{ drawOnChartArea: false }} }},
      }},
    }},
  }});
}}
document.getElementById('qLeftMetric').addEventListener('change', buildQualityChart);
document.getElementById('qRightMetric').addEventListener('change', buildQualityChart);
buildQualityChart();
</script>

</body>
</html>"""

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w") as f:
        f.write(html)

    size_kb = OUTPUT_FILE.stat().st_size / 1024
    print(f"Quality dashboard written to {OUTPUT_FILE} ({size_kb:.0f} KB)")


if __name__ == "__main__":
    generate()
