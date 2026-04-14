#!/usr/bin/env python3
"""Fetch bug issues from elastic/kibana via gh issue list with monthly pagination."""

import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"
OUTPUT_FILE = DATA_DIR / "issues.json"
REPO = "elastic/kibana"

IMPACT_LABELS = {
    "impact:critical": "critical",
    "impact:high": "high",
    "impact:medium": "medium",
    "impact:low": "low",
}


def extract_impact(labels: list) -> str:
    """Extract impact level from impact:* labels."""
    for label in labels:
        if label in IMPACT_LABELS:
            return IMPACT_LABELS[label]
    return "unknown"


def extract_defect_level(labels: list) -> int | None:
    """Extract defect level from defect-level-* labels."""
    for label in labels:
        if label.startswith("defect-level-"):
            try:
                return int(label.split("-")[-1])
            except ValueError:
                pass
    return None


def fetch_month(year: int, month: int) -> list:
    next_year = year + (1 if month == 12 else 0)
    next_month = (month % 12) + 1
    date_range = f"created:{year}-{month:02d}-01..{next_year}-{next_month:02d}-01"

    cmd = [
        "gh", "issue", "list",
        "-R", REPO,
        "--state", "all",
        "--label", "bug",
        "--limit", "5000",
        "--search", date_range,
        "--json", "number,title,author,state,createdAt,closedAt,labels",
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        print(f"  Error for {year}-{month:02d}: {result.stderr}", file=sys.stderr)
        return []

    issues = json.loads(result.stdout)
    return issues


def fetch_issues():
    if OUTPUT_FILE.exists():
        print(f"Cache exists: {OUTPUT_FILE} — skipping. Delete to re-run.")
        return

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    all_issues = []
    current = datetime(2024, 10, 1)
    end = datetime(2026, 5, 1)

    while current < end:
        print(f"Fetching bug issues for {current.year}-{current.month:02d}...")
        batch = fetch_month(current.year, current.month)
        print(f"  Found {len(batch)} issues")
        all_issues.extend(batch)

        if current.month == 12:
            current = current.replace(year=current.year + 1, month=1)
        else:
            current = current.replace(month=current.month + 1)

    # Deduplicate by issue number
    seen = set()
    unique = []
    for issue in all_issues:
        num = issue.get("number")
        if num and num not in seen:
            seen.add(num)
            unique.append(issue)

    # Extract and normalize fields
    processed = []
    for issue in unique:
        labels = [lbl["name"] for lbl in issue.get("labels", [])]

        # Legacy severity extraction (backward compat)
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
            "author": issue.get("author", {}).get("login", ""),
            "state": issue.get("state", "").lower(),
            "created_at": issue.get("createdAt"),
            "closed_at": issue.get("closedAt"),
            "labels": labels,
            "severity": severity,
            "impact": extract_impact(labels),
            "is_regression": "regression" in labels,
            "defect_level": extract_defect_level(labels),
            "qa_validated": "QA:Validated" in labels,
            "version_labels": [l for l in labels if l.startswith("v")],
        })

    with open(OUTPUT_FILE, "w") as f:
        json.dump(processed, f, indent=2, default=str)

    closed = sum(1 for i in processed if i["state"] == "closed")
    print(f"\nSaved {len(processed)} bug issues to {OUTPUT_FILE}")
    print(f"  Closed: {closed}, Open: {len(processed) - closed}")


if __name__ == "__main__":
    fetch_issues()
