#!/usr/bin/env python3
"""Compute metrics from joined data."""

import json
from pathlib import Path

import numpy as np
import pandas as pd

DATA_DIR = Path(__file__).parent / "data"
JOINED_FILE = DATA_DIR / "joined.csv"
ISSUES_FILE = DATA_DIR / "issues_enriched.csv"
PRS_FILE = DATA_DIR / "prs.json"
OUTPUT_FILE = DATA_DIR / "metrics.json"
TEST_COVERAGE_FILE = DATA_DIR / "test_coverage_proxy.json"


def load_joined() -> pd.DataFrame:
    df = pd.read_csv(JOINED_FILE)
    df["date"] = pd.to_datetime(df["date"], utc=True)
    df["month"] = df["date"].dt.to_period("M")
    df["week"] = df["date"].dt.to_period("W")
    df["is_bot"] = df["is_bot"].fillna(False).astype(bool)
    df["ai_assisted"] = df["ai_assisted"].fillna(False).astype(bool)
    df["has_ai_co_author"] = df["has_ai_co_author"].fillna(False).astype(bool)
    return df


def load_prs() -> pd.DataFrame:
    with open(PRS_FILE) as f:
        data = json.load(f)
    df = pd.DataFrame(data)
    df["created_at"] = pd.to_datetime(df["created_at"], utc=True)
    df["merged_at"] = pd.to_datetime(df["merged_at"], utc=True, errors="coerce")
    df["closed_at"] = pd.to_datetime(df["closed_at"], utc=True, errors="coerce")
    df["merged_at"] = df["merged_at"].fillna(df["closed_at"])
    df["cycle_time_hours"] = (
        (df["merged_at"] - df["created_at"]).dt.total_seconds() / 3600
    )
    df["month"] = df["created_at"].dt.to_period("M")
    df["has_ai_signal"] = df["has_ai_signal"].fillna(False).astype(bool)
    return df


def load_issues() -> pd.DataFrame:
    df = pd.read_csv(ISSUES_FILE)
    df["created_at"] = pd.to_datetime(df["created_at"], utc=True)
    df["closed_at"] = pd.to_datetime(df["closed_at"], utc=True, errors="coerce")
    df["month"] = df["created_at"].dt.to_period("M")
    df["resolution_time_hours"] = pd.to_numeric(
        df["resolution_time_hours"], errors="coerce"
    )
    # New fields
    df["is_regression"] = df["is_regression"].fillna(False).astype(bool)
    df["impact"] = df["impact"].fillna("unknown")
    return df


def load_test_coverage() -> dict:
    if not TEST_COVERAGE_FILE.exists():
        return {}
    with open(TEST_COVERAGE_FILE) as f:
        return json.load(f)


def percentiles(series: pd.Series) -> dict:
    s = series.dropna()
    if len(s) == 0:
        return {"p50": None, "p75": None, "p95": None, "mean": None}
    return {
        "p50": float(np.percentile(s, 50)),
        "p75": float(np.percentile(s, 75)),
        "p95": float(np.percentile(s, 95)),
        "mean": float(s.mean()),
    }


def analyze():
    if OUTPUT_FILE.exists():
        print(f"Cache exists: {OUTPUT_FILE} — skipping. Delete to re-run.")
        return

    commits = load_joined()
    prs = load_prs()
    issues = load_issues()
    test_coverage = load_test_coverage()

    # Filter out bot commits for human metrics
    human_commits = commits[~commits["is_bot"]]

    metrics = {"monthly": {}, "summary": {}}

    months = sorted(human_commits["month"].unique())

    for month in months:
        m_str = str(month)
        mc = human_commits[human_commits["month"] == month]
        mp = prs[prs["month"] == month]
        mi = issues[issues["month"] == month]

        # --- Release Speed Metrics ---
        pr_cycle = percentiles(mp["cycle_time_hours"])
        pr_throughput = len(mp)
        commit_count = len(mc)
        unique_authors = mc["author_email"].nunique()
        commits_per_author = commit_count / unique_authors if unique_authors > 0 else 0

        pr_sizes = mc[mc["pr_number"].notna()]
        avg_lines = float(
            (pr_sizes["insertions"] + pr_sizes["deletions"]).mean()
        ) if len(pr_sizes) > 0 else 0

        # --- Bug Metrics ---
        bug_count = len(mi)
        closed_issues = mi[mi["closed_at"].notna()]
        bug_resolution = percentiles(closed_issues["resolution_time_hours"])

        # Bug severity distribution
        severity_counts = mi["severity"].value_counts().to_dict()

        # --- AI Signal Metrics ---
        ai_commit_count = mc["ai_assisted"].sum()
        ai_commit_rate = float(ai_commit_count / len(mc)) if len(mc) > 0 else 0

        ai_pr_count = mp["has_ai_signal"].sum()
        ai_pr_rate = float(ai_pr_count / len(mp)) if len(mp) > 0 else 0

        # AI vs non-AI PR comparison
        ai_prs = mp[mp["has_ai_signal"]]
        non_ai_prs = mp[~mp["has_ai_signal"]]

        # --- Quality Metrics ---
        regression_issues = mi[mi["is_regression"] == True]
        regression_count = len(regression_issues)
        regression_rate = round(regression_count / bug_count, 4) if bug_count > 0 else 0
        regression_density = round(regression_count / pr_throughput, 4) if pr_throughput > 0 else 0

        defect_density = round(bug_count / pr_throughput, 4) if pr_throughput > 0 else 0

        # Weighted defect score using impact labels
        impact_weights = {"critical": 4, "high": 3, "medium": 2, "low": 1, "unknown": 0}
        impact_counts = mi["impact"].value_counts().to_dict()
        weighted_defect_score = sum(
            impact_weights.get(imp, 0) * count
            for imp, count in impact_counts.items()
        )

        # Test coverage proxy for this month
        tc = test_coverage.get(m_str, {})

        metrics["monthly"][m_str] = {
            "pr_cycle_time": pr_cycle,
            "pr_throughput": pr_throughput,
            "commit_count": commit_count,
            "unique_authors": unique_authors,
            "commits_per_author": round(commits_per_author, 1),
            "avg_pr_lines_changed": round(avg_lines, 0),
            "bug_count": bug_count,
            "bug_resolution_time": bug_resolution,
            "bug_severity": severity_counts,
            "ai_commit_count": int(ai_commit_count),
            "ai_commit_rate": round(ai_commit_rate, 4),
            "ai_pr_count": int(ai_pr_count),
            "ai_pr_rate": round(ai_pr_rate, 4),
            "ai_pr_cycle_time": percentiles(ai_prs["cycle_time_hours"]),
            "non_ai_pr_cycle_time": percentiles(non_ai_prs["cycle_time_hours"]),
            "regression_count": regression_count,
            "regression_rate": regression_rate,
            "regression_density": regression_density,
            "defect_density": defect_density,
            "weighted_defect_score": weighted_defect_score,
            "impact_distribution": impact_counts,
            "test_to_prod_ratio": tc.get("test_to_prod_ratio", 0),
            "test_line_ratio": tc.get("test_line_ratio", 0),
            "new_test_files": tc.get("new_test_files", 0),
        }

    # Compute quality score (normalized 0-1, higher = better)
    all_wds = [
        metrics["monthly"][m]["weighted_defect_score"]
        for m in metrics["monthly"]
    ]
    max_wds = max(all_wds) if all_wds and max(all_wds) > 0 else 1
    for m in metrics["monthly"]:
        wds = metrics["monthly"][m]["weighted_defect_score"]
        metrics["monthly"][m]["quality_score"] = round(1 - (wds / max_wds), 4)

    # --- Summary Stats ---
    metrics["summary"] = {
        "total_commits": len(human_commits),
        "total_prs": len(prs),
        "total_bug_issues": len(issues),
        "total_ai_commits": int(human_commits["ai_assisted"].sum()),
        "overall_ai_commit_rate": round(
            float(human_commits["ai_assisted"].mean()), 4
        ),
        "overall_pr_cycle_time": percentiles(prs["cycle_time_hours"]),
        "overall_bug_resolution_time": percentiles(
            issues["resolution_time_hours"]
        ),
        "overall_defect_density": round(
            len(issues) / len(prs), 4
        ) if len(prs) > 0 else 0,
        "overall_regression_count": int(issues["is_regression"].sum()),
        "overall_regression_rate": round(
            float(issues["is_regression"].mean()), 4
        ),
        "months_covered": len(months),
        "date_range": f"{months[0]} to {months[-1]}",
    }

    with open(OUTPUT_FILE, "w") as f:
        json.dump(metrics, f, indent=2, default=str)

    print(f"Metrics computed and saved to {OUTPUT_FILE}")
    print(f"  Months: {len(months)}")
    print(f"  Total commits (human): {metrics['summary']['total_commits']}")
    print(f"  Total PRs: {metrics['summary']['total_prs']}")
    print(f"  Total bug issues: {metrics['summary']['total_bug_issues']}")
    print(f"  AI commit rate: {metrics['summary']['overall_ai_commit_rate']:.1%}")


if __name__ == "__main__":
    analyze()
