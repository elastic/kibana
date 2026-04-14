#!/usr/bin/env python3
"""AI Impact on Quality — Honest Assessment.

Analyzes whether AI adoption correlates with quality changes in Kibana
development across defect rates, resolution speed, test discipline,
and PR hygiene. Produces inline charts and a structured text summary.

Usage:
    python3 ai_quality_analysis.py
"""

import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from scipy import stats

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
DATA_DIR = Path(__file__).parent / "data"
METRICS_FILE = DATA_DIR / "metrics.json"
JOINED_FILE = DATA_DIR / "joined.csv"
ISSUES_FILE = DATA_DIR / "issues_enriched.csv"
TEAM_FILE = DATA_DIR / "team_metrics.json"
TEST_COV_FILE = DATA_DIR / "test_coverage_proxy.json"

# Period definitions
EARLY_MONTHS = ["2024-10", "2024-11", "2024-12"]
LATE_MONTHS = ["2026-02", "2026-03", "2026-04"]

sns.set_theme(style="whitegrid", palette="muted")
plt.rcParams.update({"figure.figsize": (12, 5), "figure.dpi": 100})


# ---------------------------------------------------------------------------
# Data Loading
# ---------------------------------------------------------------------------
def load_metrics() -> dict:
    with open(METRICS_FILE) as f:
        return json.load(f)


def load_monthly_df(metrics: dict) -> pd.DataFrame:
    """Convert metrics['monthly'] dict into a DataFrame with one row per month."""
    rows = []
    for month_str, m in metrics["monthly"].items():
        rows.append(
            {
                "month": month_str,
                "ai_commit_rate": m["ai_commit_rate"] * 100,
                "ai_pr_rate": m["ai_pr_rate"] * 100,
                "defect_density": m["defect_density"],
                "regression_rate": m["regression_rate"] * 100,
                "regression_count": m["regression_count"],
                "test_to_prod_ratio": m["test_to_prod_ratio"],
                "test_line_ratio": m["test_line_ratio"],
                "pr_cycle_time_p50": m["pr_cycle_time"]["p50"],
                "pr_throughput": m["pr_throughput"],
                "avg_pr_lines": m["avg_pr_lines_changed"],
                "bug_count": m["bug_count"],
                "bug_resolution_p50": m["bug_resolution_time"]["p50"],
                "quality_score": m["quality_score"],
                "ai_pr_cycle_p50": m["ai_pr_cycle_time"]["p50"],
                "non_ai_pr_cycle_p50": m["non_ai_pr_cycle_time"]["p50"],
                "commit_count": m["commit_count"],
                "ai_commit_count": m["ai_commit_count"],
            }
        )
    df = pd.DataFrame(rows)
    df = df.sort_values("month").reset_index(drop=True)
    return df


def load_prs_from_joined() -> pd.DataFrame:
    """Load joined.csv and deduplicate to one row per PR.

    For each PR, take:
    - max of has_ai_co_author and pr_has_ai_signal across commits → ai_flag
    - first pr_cycle_time_hours, pr_created_at, pr_merged_at
    - sum of insertions + deletions → total_lines
    - count of commits
    """
    df = pd.read_csv(JOINED_FILE)
    df["has_ai_co_author"] = df["has_ai_co_author"].fillna(False).astype(bool)
    df["pr_has_ai_signal"] = df["pr_has_ai_signal"].fillna(False).astype(bool)
    df["is_bot"] = df["is_bot"].fillna(False).astype(bool)

    # Drop bot commits and rows without a PR number
    df = df[~df["is_bot"] & df["pr_number"].notna()].copy()
    df["pr_number"] = df["pr_number"].astype(int)
    df["total_lines"] = df["insertions"].fillna(0) + df["deletions"].fillna(0)
    df["pr_cycle_time_hours"] = pd.to_numeric(
        df["pr_cycle_time_hours"], errors="coerce"
    )

    prs = df.groupby("pr_number").agg(
        ai_co_author=("has_ai_co_author", "max"),
        ai_signal=("pr_has_ai_signal", "max"),
        cycle_time_hours=("pr_cycle_time_hours", "first"),
        total_lines=("total_lines", "sum"),
        month=("month", "first"),
        commit_count=("hash", "count"),
    )
    prs["ai_flag"] = prs["ai_co_author"] | prs["ai_signal"]
    prs = prs.reset_index()
    return prs


def load_teams() -> pd.DataFrame:
    """Load team_metrics.json top_teams into a DataFrame."""
    with open(TEAM_FILE) as f:
        data = json.load(f)
    rows = []
    for t in data["top_teams"]:
        rows.append(
            {
                "team": t["team"].replace("Team:", "").strip(),
                "total_prs": t["total_prs"],
                "total_bugs": t["total_bugs"],
                "ai_pr_rate": t["ai_pr_rate"] * 100,
                "defect_density": t["defect_density"],
                "regression_count": t["regression_count"],
                "pr_cycle_time_p50": t["pr_cycle_time"]["p50"],
            }
        )
    return pd.DataFrame(rows)


def period_label(month: str) -> str:
    if month in EARLY_MONTHS:
        return "Early (Oct-Dec 2024)"
    if month in LATE_MONTHS:
        return "Late (Feb-Apr 2026)"
    return "Growth"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print("=" * 70)
    print("AI IMPACT ON QUALITY — HONEST ASSESSMENT")
    print("Kibana (elastic/kibana) · Oct 2024 – Apr 2026 · 19 months")
    print("=" * 70)
    print()

    metrics = load_metrics()
    monthly = load_monthly_df(metrics)
    prs = load_prs_from_joined()
    teams = load_teams()

    print(f"Loaded: {len(monthly)} months, {len(prs)} PRs, {len(teams)} teams")
    print()

    # Sections 2-5 will be added in subsequent tasks


if __name__ == "__main__":
    main()
