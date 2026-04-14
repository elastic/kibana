#!/usr/bin/env python3
"""Analyze metrics per team using PR/issue labels, with security deep-dive."""

import csv
import json
import re
import subprocess
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
import pandas as pd

DATA_DIR = Path(__file__).parent / "data"
PRS_FILE = DATA_DIR / "prs.json"
ISSUES_FILE = DATA_DIR / "issues.json"
JOINED_FILE = DATA_DIR / "joined.csv"
OUTPUT_FILE = DATA_DIR / "team_metrics.json"
REPO_ROOT = Path(__file__).resolve().parents[3]

SECURITY_TEAMS = [
    "Team: SecuritySolution",
    "Team:Security",
    "Team:Cloud Security",
    "Team:Security Generative AI",
    "Team:Threat Hunting",
    "Team:Threat Hunting:Investigations",
    "Team:Defend Workflows",
    "Team:Entity Analytics",
    "Team:Detection Rule Management",
    "Team:Detection Engine",
    "Team:Detections and Resp",
    "Team:Security-Scalability",
]

SECURITY_PATHS = [
    "x-pack/solutions/security/",
    "x-pack/platform/plugins/security/",
]

SINCE_DATE = "2024-10-01"


def extract_team(labels: list) -> list:
    return [l for l in labels if l.startswith("Team:") or l.startswith("Team: ")]


def percentiles(series):
    s = series.dropna()
    if len(s) == 0:
        return {"p50": None, "p75": None, "mean": None}
    return {
        "p50": round(float(np.percentile(s, 50)), 1),
        "p75": round(float(np.percentile(s, 75)), 1),
        "mean": round(float(s.mean()), 1),
    }


def load_prs():
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
    return df


def load_issues():
    with open(ISSUES_FILE) as f:
        data = json.load(f)
    df = pd.DataFrame(data)
    df["created_at"] = pd.to_datetime(df["created_at"], utc=True)
    df["closed_at"] = pd.to_datetime(df["closed_at"], utc=True, errors="coerce")
    df["resolution_hours"] = None
    closed = df["closed_at"].notna()
    df.loc[closed, "resolution_hours"] = (
        (df.loc[closed, "closed_at"] - df.loc[closed, "created_at"]).dt.total_seconds() / 3600
    )
    df["month"] = df["created_at"].dt.to_period("M")
    if "is_regression" in df.columns:
        df["is_regression"] = df["is_regression"].fillna(False).astype(bool)
    else:
        df["is_regression"] = False
    if "impact" in df.columns:
        df["impact"] = df["impact"].fillna("unknown")
    else:
        df["impact"] = "unknown"
    return df


def get_security_commits():
    """Extract commit-level data for security file paths."""
    sep = "---SEP---"
    fsep = "---FSEP---"
    fmt = fsep.join(["%H", "%an", "%ae", "%aI", "%s", "%b"])

    path_args = []
    for p in SECURITY_PATHS:
        path_args.extend(["--", p])

    cmd = [
        "git", "log", f"--since={SINCE_DATE}",
        f"--format={sep}{fmt}",
        "--shortstat",
    ] + path_args

    result = subprocess.run(cmd, capture_output=True, text=True, cwd=REPO_ROOT)
    if result.returncode != 0:
        print(f"git log failed: {result.stderr}")
        return pd.DataFrame()

    co_author_re = re.compile(r"Co-authored-by:\s*(.+)", re.IGNORECASE)
    ai_patterns = [re.compile(p, re.IGNORECASE) for p in ["copilot", "claude", "anthropic", "openai", "gpt"]]
    stat_re = re.compile(r"(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?")

    rows = []
    for block in result.stdout.split(sep):
        block = block.strip()
        if not block:
            continue
        parts = block.split(fsep, 5)
        if len(parts) < 5:
            continue

        body = parts[5] if len(parts) > 5 else ""
        co_authors = co_author_re.findall(body)
        has_ai = any(any(p.search(ca) for p in ai_patterns) for ca in co_authors)

        stat_match = stat_re.search(block)
        files_changed = int(stat_match.group(1) or 0) if stat_match else 0
        insertions = int(stat_match.group(2) or 0) if stat_match else 0
        deletions = int(stat_match.group(3) or 0) if stat_match else 0

        pr_match = re.search(r"\(#(\d+)\)\s*$", parts[4])

        rows.append({
            "hash": parts[0].strip(),
            "author": parts[1].strip(),
            "email": parts[2].strip(),
            "date": parts[3].strip(),
            "subject": parts[4].strip(),
            "has_ai": has_ai,
            "files_changed": files_changed,
            "insertions": insertions,
            "deletions": deletions,
            "pr_number": int(pr_match.group(1)) if pr_match else None,
        })

    df = pd.DataFrame(rows)
    if len(df) > 0:
        df["date"] = pd.to_datetime(df["date"], utc=True)
        df["month"] = df["date"].dt.to_period("M")
    return df


def analyze_team(team_name, prs, issues):
    team_prs = prs[prs["labels"].apply(lambda ls: team_name in ls)]
    team_issues = issues[issues["labels"].apply(lambda ls: team_name in ls)]

    if len(team_prs) == 0 and len(team_issues) == 0:
        return None

    months = sorted(set(
        list(team_prs["month"].unique()) + list(team_issues["month"].unique())
    ))

    monthly = {}
    for m in months:
        mp = team_prs[team_prs["month"] == m]
        mi = team_issues[team_issues["month"] == m]
        ai_prs = mp[mp["has_ai_signal"] == True]

        monthly[str(m)] = {
            "pr_count": len(mp),
            "pr_cycle_time": percentiles(mp["cycle_time_hours"]),
            "ai_pr_count": len(ai_prs),
            "ai_pr_rate": round(len(ai_prs) / len(mp), 4) if len(mp) > 0 else 0,
            "bug_count": len(mi),
            "bug_resolution": percentiles(mi["resolution_hours"]),
            "regression_count": int(mi["is_regression"].sum()),
            "regression_rate": round(float(mi["is_regression"].mean()), 4) if len(mi) > 0 else 0,
        }

    return {
        "team": team_name,
        "total_prs": len(team_prs),
        "total_bugs": len(team_issues),
        "total_ai_prs": int(team_prs["has_ai_signal"].sum()),
        "ai_pr_rate": round(float(team_prs["has_ai_signal"].mean()), 4) if len(team_prs) > 0 else 0,
        "pr_cycle_time": percentiles(team_prs["cycle_time_hours"]),
        "bug_resolution": percentiles(team_issues["resolution_hours"]),
        "regression_count": int(team_issues["is_regression"].sum()),
        "regression_rate": round(float(team_issues["is_regression"].mean()), 4) if len(team_issues) > 0 else 0,
        "defect_density": round(len(team_issues) / len(team_prs), 4) if len(team_prs) > 0 else 0,
        "monthly": monthly,
    }


def analyze_security_code(sec_commits, prs):
    """Deep-dive on security file-path commits."""
    if len(sec_commits) == 0:
        return {}

    months = sorted(sec_commits["month"].unique())
    monthly = {}
    for m in months:
        mc = sec_commits[sec_commits["month"] == m]
        monthly[str(m)] = {
            "commit_count": len(mc),
            "ai_commit_count": int(mc["has_ai"].sum()),
            "ai_rate": round(float(mc["has_ai"].mean()), 4) if len(mc) > 0 else 0,
            "unique_authors": mc["email"].nunique(),
            "avg_lines": round(float((mc["insertions"] + mc["deletions"]).mean()), 0),
        }

    # Top contributors to security code
    author_counts = sec_commits.groupby("author").agg(
        commits=("hash", "count"),
        ai_commits=("has_ai", "sum"),
    ).sort_values("commits", ascending=False).head(15)

    top_authors = []
    for name, row in author_counts.iterrows():
        top_authors.append({
            "author": name,
            "commits": int(row["commits"]),
            "ai_commits": int(row["ai_commits"]),
        })

    return {
        "total_commits": len(sec_commits),
        "total_ai_commits": int(sec_commits["has_ai"].sum()),
        "ai_rate": round(float(sec_commits["has_ai"].mean()), 4),
        "unique_authors": sec_commits["email"].nunique(),
        "monthly": monthly,
        "top_authors": top_authors,
    }


def main():
    if OUTPUT_FILE.exists():
        print(f"Cache exists: {OUTPUT_FILE} — skipping. Delete to re-run.")
        return

    print("Loading data...")
    prs = load_prs()
    issues = load_issues()

    # --- All teams overview ---
    print("Analyzing teams...")
    team_pr_counts = Counter()
    team_bug_counts = Counter()
    for _, row in prs.iterrows():
        for t in extract_team(row["labels"]):
            team_pr_counts[t] += 1
    for _, row in issues.iterrows():
        for t in extract_team(row["labels"]):
            team_bug_counts[t] += 1

    all_teams = set(team_pr_counts.keys()) | set(team_bug_counts.keys())
    top_teams = sorted(all_teams, key=lambda t: team_pr_counts[t] + team_bug_counts[t], reverse=True)[:20]

    team_summaries = []
    for team in top_teams:
        result = analyze_team(team, prs, issues)
        if result:
            team_summaries.append(result)

    # --- Security teams deep-dive ---
    print("Analyzing security teams...")
    security_team_data = []
    for team in SECURITY_TEAMS:
        result = analyze_team(team, prs, issues)
        if result:
            security_team_data.append(result)

    # --- Security code path analysis ---
    print("Analyzing security code paths...")
    sec_commits = get_security_commits()
    security_code = analyze_security_code(sec_commits, prs)

    output = {
        "top_teams": team_summaries,
        "security_teams": security_team_data,
        "security_code": security_code,
    }

    with open(OUTPUT_FILE, "w") as f:
        json.dump(output, f, indent=2, default=str)

    print(f"\nTeam metrics saved to {OUTPUT_FILE}")
    print(f"  Top teams analyzed: {len(team_summaries)}")
    print(f"  Security teams: {len(security_team_data)}")
    print(f"  Security code commits: {security_code.get('total_commits', 0)}")
    print(f"  Security AI rate: {security_code.get('ai_rate', 0):.1%}")


if __name__ == "__main__":
    main()
