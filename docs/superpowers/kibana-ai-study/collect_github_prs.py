#!/usr/bin/env python3
"""Fetch merged PRs from elastic/kibana via GitHub API (gh CLI)."""

import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"
OUTPUT_FILE = DATA_DIR / "prs.json"
REPO = "elastic/kibana"
SINCE_DATE = "2024-10-01"

AI_KEYWORDS = [
    "copilot", "claude", "ai-generated", "ai generated",
    "llm", "chatgpt", "gpt-4", "gpt4", "openai",
    "ai-assisted", "ai assisted", "github copilot",
    "claude code", "anthropic",
]


def has_ai_signal(text: str) -> bool:
    lower = text.lower()
    return any(kw in lower for kw in AI_KEYWORDS)


def fetch_prs():
    if OUTPUT_FILE.exists():
        print(f"Cache exists: {OUTPUT_FILE} — skipping. Delete to re-run.")
        return

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # Use GitHub search API to find merged PRs since our date
    # gh search returns up to 1000 results per query, so we paginate by month
    all_prs = []
    current = datetime(2024, 10, 1)
    end = datetime(2026, 5, 1)

    while current < end:
        next_month = datetime(
            current.year + (1 if current.month == 12 else 0),
            (current.month % 12) + 1,
            1,
        )
        date_range = f"{current.strftime('%Y-%m-%d')}..{next_month.strftime('%Y-%m-%d')}"

        print(f"Fetching merged PRs for {date_range}...")

        cmd = [
            "gh", "api", "--paginate",
            f"/search/issues?q=repo:{REPO}+is:pr+is:merged+merged:{date_range}&per_page=100",
            "--jq", ".items[]",
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            print(f"Error fetching PRs for {date_range}: {result.stderr}", file=sys.stderr)
            current = next_month
            continue

        # Each line is a JSON object
        for line in result.stdout.strip().split("\n"):
            line = line.strip()
            if not line:
                continue
            try:
                pr = json.loads(line)
                all_prs.append(pr)
            except json.JSONDecodeError:
                continue

        current = next_month

    # Deduplicate by PR number
    seen = set()
    unique_prs = []
    for pr in all_prs:
        num = pr.get("number")
        if num and num not in seen:
            seen.add(num)
            unique_prs.append(pr)

    # Extract fields we need and detect AI signals
    processed = []
    for pr in unique_prs:
        title = pr.get("title", "")
        body = pr.get("body", "") or ""
        labels = [lbl["name"] for lbl in pr.get("labels", [])]

        processed.append({
            "number": pr["number"],
            "title": title,
            "author": pr.get("user", {}).get("login", ""),
            "created_at": pr.get("created_at"),
            "closed_at": pr.get("closed_at"),
            "merged_at": pr.get("pull_request", {}).get("merged_at"),
            "labels": labels,
            "has_ai_signal_title": has_ai_signal(title),
            "has_ai_signal_body": has_ai_signal(body),
            "has_ai_signal": has_ai_signal(title) or has_ai_signal(body),
        })

    with open(OUTPUT_FILE, "w") as f:
        json.dump(processed, f, indent=2, default=str)

    ai_count = sum(1 for p in processed if p["has_ai_signal"])
    print(f"Fetched {len(processed)} merged PRs to {OUTPUT_FILE}")
    print(f"  With AI signal in title/body: {ai_count}")


if __name__ == "__main__":
    fetch_prs()
