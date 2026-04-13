#!/usr/bin/env python3
"""Fetch bug issues from elastic/kibana via GitHub API (gh CLI)."""

import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"
OUTPUT_FILE = DATA_DIR / "issues.json"
REPO = "elastic/kibana"
SINCE_DATE = "2024-10-01"


def fetch_issues():
    if OUTPUT_FILE.exists():
        print(f"Cache exists: {OUTPUT_FILE} — skipping. Delete to re-run.")
        return

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    all_issues = []
    current = datetime(2024, 10, 1)
    end = datetime(2026, 5, 1)

    while current < end:
        next_month = datetime(
            current.year + (1 if current.month == 12 else 0),
            (current.month % 12) + 1,
            1,
        )
        date_range = f"{current.strftime('%Y-%m-%d')}..{next_month.strftime('%Y-%m-%d')}"

        print(f"Fetching bug issues for {date_range}...")

        cmd = [
            "gh", "api", "--paginate",
            f"/search/issues?q=repo:{REPO}+is:issue+label:bug+created:{date_range}&per_page=100",
            "--jq", ".items[]",
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            print(f"Error fetching issues for {date_range}: {result.stderr}", file=sys.stderr)
            current = next_month
            continue

        for line in result.stdout.strip().split("\n"):
            line = line.strip()
            if not line:
                continue
            try:
                issue = json.loads(line)
                all_issues.append(issue)
            except json.JSONDecodeError:
                continue

        current = next_month

    # Deduplicate by issue number
    seen = set()
    unique_issues = []
    for issue in all_issues:
        num = issue.get("number")
        if num and num not in seen:
            seen.add(num)
            unique_issues.append(issue)

    # Extract fields
    processed = []
    for issue in unique_issues:
        labels = [lbl["name"] for lbl in issue.get("labels", [])]

        # Detect severity from labels
        severity = "unknown"
        for label in labels:
            lower = label.lower()
            if "critical" in lower or "blocker" in lower:
                severity = "critical"
                break
            elif "high" in lower or "major" in lower:
                severity = "high"
                break
            elif "medium" in lower or "moderate" in lower:
                severity = "medium"
                break
            elif "low" in lower or "minor" in lower:
                severity = "low"
                break

        processed.append({
            "number": issue["number"],
            "title": issue.get("title", ""),
            "author": issue.get("user", {}).get("login", ""),
            "state": issue.get("state", ""),
            "created_at": issue.get("created_at"),
            "closed_at": issue.get("closed_at"),
            "labels": labels,
            "severity": severity,
        })

    with open(OUTPUT_FILE, "w") as f:
        json.dump(processed, f, indent=2, default=str)

    closed = sum(1 for i in processed if i["state"] == "closed")
    print(f"Fetched {len(processed)} bug issues to {OUTPUT_FILE}")
    print(f"  Closed: {closed}, Open: {len(processed) - closed}")


if __name__ == "__main__":
    fetch_issues()
