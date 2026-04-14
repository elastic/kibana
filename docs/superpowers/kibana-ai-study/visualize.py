#!/usr/bin/env python3
"""Generate charts from computed metrics."""

import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")  # Non-interactive backend
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import seaborn as sns

CHARTS_DIR = Path(__file__).parent / "output" / "charts"
METRICS_FILE = Path(__file__).parent / "data" / "metrics.json"

sns.set_theme(style="whitegrid", palette="muted")
FIGSIZE = (14, 6)
AI_COLOR = "#E63946"
MAIN_COLOR = "#457B9D"
BUG_COLOR = "#F4A261"
SECONDARY_COLOR = "#2A9D8F"


def load_metrics() -> dict:
    with open(METRICS_FILE) as f:
        return json.load(f)


TEST_COVERAGE_FILE = Path(__file__).parent / "data" / "test_coverage_proxy.json"


def load_test_coverage() -> dict:
    if not TEST_COVERAGE_FILE.exists():
        return {}
    with open(TEST_COVERAGE_FILE) as f:
        return json.load(f)


def get_monthly_series(metrics: dict, key: str) -> tuple[list, list]:
    """Extract a monthly time series from metrics."""
    monthly = metrics["monthly"]
    months = sorted(monthly.keys())
    values = []
    for m in months:
        val = monthly[m].get(key)
        if isinstance(val, dict):
            val = val.get("p50")
        values.append(val)
    return months, values


def plot_pr_cycle_time(metrics: dict):
    monthly = metrics["monthly"]
    months = sorted(monthly.keys())
    p50 = [monthly[m]["pr_cycle_time"]["p50"] for m in months]
    p75 = [monthly[m]["pr_cycle_time"]["p75"] for m in months]
    p95 = [monthly[m]["pr_cycle_time"]["p95"] for m in months]

    fig, ax = plt.subplots(figsize=FIGSIZE)
    ax.plot(months, p50, marker="o", label="p50", color=MAIN_COLOR, linewidth=2)
    ax.plot(months, p75, marker="s", label="p75", color=SECONDARY_COLOR, linewidth=1.5)
    ax.plot(months, p95, marker="^", label="p95", color=BUG_COLOR, linewidth=1, alpha=0.7)
    ax.set_title("PR Cycle Time (hours) — Creation to Merge", fontsize=14)
    ax.set_xlabel("Month")
    ax.set_ylabel("Hours")
    ax.legend()
    ax.tick_params(axis="x", rotation=45)
    fig.tight_layout()
    fig.savefig(CHARTS_DIR / "pr_cycle_time.png", dpi=150)
    plt.close()
    print("  Created: pr_cycle_time.png")


def plot_pr_throughput(metrics: dict):
    months, values = get_monthly_series(metrics, "pr_throughput")

    fig, ax = plt.subplots(figsize=FIGSIZE)
    ax.bar(months, values, color=MAIN_COLOR, alpha=0.8)
    ax.set_title("Merged PRs per Month", fontsize=14)
    ax.set_xlabel("Month")
    ax.set_ylabel("Count")
    ax.tick_params(axis="x", rotation=45)
    fig.tight_layout()
    fig.savefig(CHARTS_DIR / "pr_throughput.png", dpi=150)
    plt.close()
    print("  Created: pr_throughput.png")


def plot_commit_velocity(metrics: dict):
    months, commits = get_monthly_series(metrics, "commit_count")
    _, per_author = get_monthly_series(metrics, "commits_per_author")

    fig, ax1 = plt.subplots(figsize=FIGSIZE)
    ax2 = ax1.twinx()

    ax1.bar(months, commits, color=MAIN_COLOR, alpha=0.6, label="Total commits")
    ax2.plot(months, per_author, color=AI_COLOR, marker="o", linewidth=2,
             label="Per author avg")

    ax1.set_title("Commit Velocity", fontsize=14)
    ax1.set_xlabel("Month")
    ax1.set_ylabel("Total Commits", color=MAIN_COLOR)
    ax2.set_ylabel("Commits per Author", color=AI_COLOR)

    lines1, labels1 = ax1.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    ax1.legend(lines1 + lines2, labels1 + labels2, loc="upper left")
    ax1.tick_params(axis="x", rotation=45)
    fig.tight_layout()
    fig.savefig(CHARTS_DIR / "commit_velocity.png", dpi=150)
    plt.close()
    print("  Created: commit_velocity.png")


def plot_pr_size_trends(metrics: dict):
    months, values = get_monthly_series(metrics, "avg_pr_lines_changed")

    fig, ax = plt.subplots(figsize=FIGSIZE)
    ax.plot(months, values, marker="o", color=MAIN_COLOR, linewidth=2)
    ax.set_title("Average Lines Changed per PR", fontsize=14)
    ax.set_xlabel("Month")
    ax.set_ylabel("Lines (insertions + deletions)")
    ax.tick_params(axis="x", rotation=45)
    fig.tight_layout()
    fig.savefig(CHARTS_DIR / "pr_size_trends.png", dpi=150)
    plt.close()
    print("  Created: pr_size_trends.png")


def plot_bug_volume(metrics: dict):
    months, values = get_monthly_series(metrics, "bug_count")

    fig, ax = plt.subplots(figsize=FIGSIZE)
    ax.bar(months, values, color=BUG_COLOR, alpha=0.8)
    ax.set_title("Bug Issues Opened per Month", fontsize=14)
    ax.set_xlabel("Month")
    ax.set_ylabel("Count")
    ax.tick_params(axis="x", rotation=45)
    fig.tight_layout()
    fig.savefig(CHARTS_DIR / "bug_volume.png", dpi=150)
    plt.close()
    print("  Created: bug_volume.png")


def plot_bug_severity(metrics: dict):
    monthly = metrics["monthly"]
    months = sorted(monthly.keys())
    severities = ["critical", "high", "medium", "low", "unknown"]
    colors = {"critical": "#E63946", "high": "#F4A261", "medium": "#E9C46A",
              "low": "#2A9D8F", "unknown": "#ADB5BD"}

    data = {sev: [] for sev in severities}
    for m in months:
        sev_data = monthly[m].get("bug_severity", {})
        for sev in severities:
            data[sev].append(sev_data.get(sev, 0))

    fig, ax = plt.subplots(figsize=FIGSIZE)
    bottom = [0] * len(months)
    for sev in severities:
        vals = data[sev]
        ax.bar(months, vals, bottom=bottom, label=sev, color=colors[sev], alpha=0.85)
        bottom = [b + v for b, v in zip(bottom, vals)]

    ax.set_title("Bug Severity Distribution Over Time", fontsize=14)
    ax.set_xlabel("Month")
    ax.set_ylabel("Count")
    ax.legend()
    ax.tick_params(axis="x", rotation=45)
    fig.tight_layout()
    fig.savefig(CHARTS_DIR / "bug_severity.png", dpi=150)
    plt.close()
    print("  Created: bug_severity.png")


def plot_bug_resolution_time(metrics: dict):
    monthly = metrics["monthly"]
    months = sorted(monthly.keys())
    p50 = [monthly[m]["bug_resolution_time"]["p50"] for m in months]
    p75 = [monthly[m]["bug_resolution_time"]["p75"] for m in months]

    fig, ax = plt.subplots(figsize=FIGSIZE)
    ax.plot(months, p50, marker="o", label="p50", color=BUG_COLOR, linewidth=2)
    ax.plot(months, p75, marker="s", label="p75", color=AI_COLOR, linewidth=1.5)
    ax.set_title("Bug Resolution Time (hours)", fontsize=14)
    ax.set_xlabel("Month")
    ax.set_ylabel("Hours")
    ax.legend()
    ax.tick_params(axis="x", rotation=45)
    fig.tight_layout()
    fig.savefig(CHARTS_DIR / "bug_resolution_time.png", dpi=150)
    plt.close()
    print("  Created: bug_resolution_time.png")


def plot_ai_adoption_rate(metrics: dict):
    months, commit_rate = get_monthly_series(metrics, "ai_commit_rate")
    _, pr_rate = get_monthly_series(metrics, "ai_pr_rate")

    commit_pct = [r * 100 if r else 0 for r in commit_rate]
    pr_pct = [r * 100 if r else 0 for r in pr_rate]

    fig, ax = plt.subplots(figsize=FIGSIZE)
    ax.plot(months, commit_pct, marker="o", label="AI co-authored commits %",
            color=AI_COLOR, linewidth=2)
    ax.plot(months, pr_pct, marker="s", label="AI-mentioned PRs %",
            color=MAIN_COLOR, linewidth=2)
    ax.set_title("AI Adoption Rate Over Time", fontsize=14)
    ax.set_xlabel("Month")
    ax.set_ylabel("Percentage (%)")
    ax.legend()
    ax.tick_params(axis="x", rotation=45)
    fig.tight_layout()
    fig.savefig(CHARTS_DIR / "ai_adoption_rate.png", dpi=150)
    plt.close()
    print("  Created: ai_adoption_rate.png")


def plot_ai_vs_non_ai_cycle_time(metrics: dict):
    monthly = metrics["monthly"]
    months = sorted(monthly.keys())

    ai_p50 = []
    non_ai_p50 = []
    for m in months:
        ai_val = monthly[m]["ai_pr_cycle_time"]["p50"]
        non_ai_val = monthly[m]["non_ai_pr_cycle_time"]["p50"]
        ai_p50.append(ai_val)
        non_ai_p50.append(non_ai_val)

    fig, ax = plt.subplots(figsize=FIGSIZE)
    ax.plot(months, ai_p50, marker="o", label="AI-signal PRs (p50)",
            color=AI_COLOR, linewidth=2)
    ax.plot(months, non_ai_p50, marker="s", label="Non-AI PRs (p50)",
            color=MAIN_COLOR, linewidth=2)
    ax.set_title("PR Cycle Time: AI-Signal vs Non-AI (p50 hours)", fontsize=14)
    ax.set_xlabel("Month")
    ax.set_ylabel("Hours")
    ax.legend()
    ax.tick_params(axis="x", rotation=45)
    fig.tight_layout()
    fig.savefig(CHARTS_DIR / "ai_vs_non_ai_cycle_time.png", dpi=150)
    plt.close()
    print("  Created: ai_vs_non_ai_cycle_time.png")


def plot_correlation_overlay(metrics: dict):
    """Overlay AI adoption rate with PR cycle time and bug count."""
    months, ai_rate = get_monthly_series(metrics, "ai_commit_rate")
    _, cycle_p50 = get_monthly_series(metrics, "pr_cycle_time")
    _, bug_count = get_monthly_series(metrics, "bug_count")

    ai_pct = [r * 100 if r else 0 for r in ai_rate]

    fig, ax1 = plt.subplots(figsize=FIGSIZE)
    ax2 = ax1.twinx()

    ax1.fill_between(range(len(months)), ai_pct, alpha=0.2, color=AI_COLOR,
                     label="AI adoption %")
    ax1.plot(range(len(months)), ai_pct, color=AI_COLOR, linewidth=2)

    ax2.plot(range(len(months)), cycle_p50, marker="o", color=MAIN_COLOR,
             linewidth=2, label="PR cycle time p50 (h)")
    ax2.plot(range(len(months)), bug_count, marker="s", color=BUG_COLOR,
             linewidth=2, label="Bug count")

    ax1.set_xticks(range(len(months)))
    ax1.set_xticklabels(months, rotation=45)
    ax1.set_xlabel("Month")
    ax1.set_ylabel("AI Adoption %", color=AI_COLOR)
    ax2.set_ylabel("PR Cycle Time (h) / Bug Count")

    lines1, labels1 = ax1.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    ax1.legend(lines1 + lines2, labels1 + labels2, loc="upper left")

    ax1.set_title("Correlation: AI Adoption vs Speed & Bugs", fontsize=14)
    fig.tight_layout()
    fig.savefig(CHARTS_DIR / "correlation_overlay.png", dpi=150)
    plt.close()
    print("  Created: correlation_overlay.png")


def plot_defect_density(metrics: dict):
    months, values = get_monthly_series(metrics, "defect_density")

    fig, ax = plt.subplots(figsize=FIGSIZE)
    ax.plot(months, values, marker="o", color=BUG_COLOR, linewidth=2)
    ax.axhline(y=sum(v for v in values if v) / len([v for v in values if v]),
               color=AI_COLOR, linestyle="--", alpha=0.5, label="Mean")
    ax.set_title("Defect Density (Bugs per Merged PR)", fontsize=14)
    ax.set_xlabel("Month")
    ax.set_ylabel("Bugs / PRs")
    ax.legend()
    ax.tick_params(axis="x", rotation=45)
    fig.tight_layout()
    fig.savefig(CHARTS_DIR / "defect_density.png", dpi=150)
    plt.close()
    print("  Created: defect_density.png")


def plot_regression_trend(metrics: dict):
    monthly = metrics["monthly"]
    months = sorted(monthly.keys())
    counts = [monthly[m].get("regression_count", 0) for m in months]
    rates = [monthly[m].get("regression_rate", 0) * 100 for m in months]

    fig, ax1 = plt.subplots(figsize=FIGSIZE)
    ax2 = ax1.twinx()

    ax1.bar(months, counts, color=AI_COLOR, alpha=0.6, label="Regression count")
    ax2.plot(months, rates, color=MAIN_COLOR, marker="o", linewidth=2,
             label="Regression rate (%)")

    ax1.set_title("Regressions Over Time", fontsize=14)
    ax1.set_xlabel("Month")
    ax1.set_ylabel("Regression Count", color=AI_COLOR)
    ax2.set_ylabel("Regression Rate (%)", color=MAIN_COLOR)

    lines1, labels1 = ax1.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    ax1.legend(lines1 + lines2, labels1 + labels2, loc="upper left")
    ax1.tick_params(axis="x", rotation=45)
    fig.tight_layout()
    fig.savefig(CHARTS_DIR / "regression_trend.png", dpi=150)
    plt.close()
    print("  Created: regression_trend.png")


def plot_test_coverage_proxy(test_coverage: dict):
    months = sorted(test_coverage.keys())
    ratios = [test_coverage[m]["test_to_prod_ratio"] for m in months]
    line_ratios = [test_coverage[m]["test_line_ratio"] for m in months]
    new_files = [test_coverage[m]["new_test_files"] for m in months]

    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(14, 10), sharex=True)

    # Top: ratios
    ax1.plot(months, ratios, marker="o", color=MAIN_COLOR, linewidth=2,
             label="Test/Prod file ratio")
    ax1.plot(months, line_ratios, marker="s", color=SECONDARY_COLOR, linewidth=2,
             label="Test/Prod line ratio")
    ax1.set_title("Test Coverage Proxy: Investment in Testing", fontsize=14)
    ax1.set_ylabel("Ratio")
    ax1.legend()

    # Bottom: new test files
    ax2.bar(months, new_files, color=MAIN_COLOR, alpha=0.7)
    ax2.set_title("New Test Files per Month", fontsize=14)
    ax2.set_xlabel("Month")
    ax2.set_ylabel("Count")
    ax2.tick_params(axis="x", rotation=45)

    fig.tight_layout()
    fig.savefig(CHARTS_DIR / "test_coverage_proxy.png", dpi=150)
    plt.close()
    print("  Created: test_coverage_proxy.png")


def plot_quality_score(metrics: dict):
    months, values = get_monthly_series(metrics, "quality_score")

    fig, ax = plt.subplots(figsize=FIGSIZE)
    ax.plot(months, values, marker="o", color=SECONDARY_COLOR, linewidth=2)
    ax.fill_between(range(len(months)), values, alpha=0.2, color=SECONDARY_COLOR)
    ax.set_xticks(range(len(months)))
    ax.set_xticklabels(months, rotation=45)
    ax.set_title("Quality Score (higher = better)", fontsize=14)
    ax.set_xlabel("Month")
    ax.set_ylabel("Score (0-1)")
    ax.set_ylim(0, 1.05)
    fig.tight_layout()
    fig.savefig(CHARTS_DIR / "quality_score.png", dpi=150)
    plt.close()
    print("  Created: quality_score.png")


def main():
    CHARTS_DIR.mkdir(parents=True, exist_ok=True)
    metrics = load_metrics()

    print("Generating charts...")
    plot_pr_cycle_time(metrics)
    plot_pr_throughput(metrics)
    plot_commit_velocity(metrics)
    plot_pr_size_trends(metrics)
    plot_bug_volume(metrics)
    plot_bug_severity(metrics)
    plot_bug_resolution_time(metrics)
    plot_ai_adoption_rate(metrics)
    plot_ai_vs_non_ai_cycle_time(metrics)
    plot_correlation_overlay(metrics)
    plot_defect_density(metrics)
    plot_regression_trend(metrics)
    plot_quality_score(metrics)

    test_coverage = load_test_coverage()
    if test_coverage:
        plot_test_coverage_proxy(test_coverage)
    print(f"All charts saved to {CHARTS_DIR}")


if __name__ == "__main__":
    main()
