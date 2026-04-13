#!/usr/bin/env python3
"""Join git commit data with GitHub PR and issue data."""

import csv
import json
from pathlib import Path

import pandas as pd

DATA_DIR = Path(__file__).parent / "data"
COMMITS_FILE = DATA_DIR / "commits.csv"
PRS_FILE = DATA_DIR / "prs.json"
ISSUES_FILE = DATA_DIR / "issues.json"
OUTPUT_FILE = DATA_DIR / "joined.csv"


def load_commits() -> pd.DataFrame:
    df = pd.read_csv(COMMITS_FILE)
    df["date"] = pd.to_datetime(df["date"], utc=True)
    df["month"] = df["date"].dt.to_period("M")
    df["week"] = df["date"].dt.to_period("W")
    return df


def load_prs() -> pd.DataFrame:
    with open(PRS_FILE) as f:
        data = json.load(f)
    df = pd.DataFrame(data)
    df["created_at"] = pd.to_datetime(df["created_at"], utc=True)
    df["closed_at"] = pd.to_datetime(df["closed_at"], utc=True, errors="coerce")
    df["merged_at"] = pd.to_datetime(df["merged_at"], utc=True, errors="coerce")

    # For PRs where merged_at is missing, use closed_at as a fallback
    df["merged_at"] = df["merged_at"].fillna(df["closed_at"])

    # Compute cycle time in hours
    df["cycle_time_hours"] = (
        (df["merged_at"] - df["created_at"]).dt.total_seconds() / 3600
    )
    df["month"] = df["created_at"].dt.to_period("M")
    df["week"] = df["created_at"].dt.to_period("W")
    return df


def load_issues() -> pd.DataFrame:
    with open(ISSUES_FILE) as f:
        data = json.load(f)
    df = pd.DataFrame(data)
    df["created_at"] = pd.to_datetime(df["created_at"], utc=True)
    df["closed_at"] = pd.to_datetime(df["closed_at"], utc=True, errors="coerce")

    # Compute resolution time in hours (only for closed issues)
    df["resolution_time_hours"] = None
    closed_mask = df["closed_at"].notna()
    df.loc[closed_mask, "resolution_time_hours"] = (
        (df.loc[closed_mask, "closed_at"] - df.loc[closed_mask, "created_at"])
        .dt.total_seconds() / 3600
    )
    df["month"] = df["created_at"].dt.to_period("M")
    df["week"] = df["created_at"].dt.to_period("W")
    return df


def join_data():
    if OUTPUT_FILE.exists():
        print(f"Cache exists: {OUTPUT_FILE} — skipping. Delete to re-run.")
        return

    print("Loading data...")
    commits = load_commits()
    prs = load_prs()
    issues = load_issues()

    # Join commits to PRs on pr_number
    pr_fields = prs[["number", "created_at", "merged_at", "cycle_time_hours",
                      "has_ai_signal", "labels"]].rename(
        columns={
            "number": "pr_number",
            "created_at": "pr_created_at",
            "merged_at": "pr_merged_at",
            "cycle_time_hours": "pr_cycle_time_hours",
            "has_ai_signal": "pr_has_ai_signal",
            "labels": "pr_labels",
        }
    )

    joined = commits.merge(pr_fields, on="pr_number", how="left")

    # Combine AI signals: commit-level co-author OR PR-level keyword
    joined["ai_assisted"] = (
        joined["has_ai_co_author"].fillna(False).astype(bool) |
        joined["pr_has_ai_signal"].fillna(False).astype(bool)
    )

    # Save joined commits
    output_cols = [
        "hash", "author_name", "author_email", "date", "subject",
        "pr_number", "files_changed", "insertions", "deletions",
        "has_ai_co_author", "ai_co_authors", "is_bot",
        "pr_created_at", "pr_merged_at", "pr_cycle_time_hours",
        "pr_has_ai_signal", "ai_assisted", "month", "week",
    ]
    joined[output_cols].to_csv(OUTPUT_FILE, index=False)

    # Save issues separately (already enriched with resolution time)
    issues_output = DATA_DIR / "issues_enriched.csv"
    issues.to_csv(issues_output, index=False)

    matched = joined["pr_number"].notna().sum()
    ai_count = joined["ai_assisted"].sum()
    print(f"Joined data: {len(joined)} commits ({matched} matched to PRs)")
    print(f"  AI-assisted commits: {ai_count}")
    print(f"  Issues enriched: {len(issues)}")
    print(f"  Output: {OUTPUT_FILE}, {issues_output}")


if __name__ == "__main__":
    join_data()
