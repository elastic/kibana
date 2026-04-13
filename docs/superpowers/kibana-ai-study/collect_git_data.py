#!/usr/bin/env python3
"""Extract git log data from the local kibana repo into CSV."""

import csv
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"
OUTPUT_FILE = DATA_DIR / "commits.csv"
SINCE_DATE = "2024-10-01"
REPO_ROOT = Path(__file__).resolve().parents[3]  # kibana root

# Record separator to avoid conflicts with commit content
SEP = "---COMMIT_SEP---"
FIELD_SEP = "---FIELD_SEP---"

AI_CO_AUTHOR_PATTERNS = [
    re.compile(r"copilot", re.IGNORECASE),
    re.compile(r"claude", re.IGNORECASE),
    re.compile(r"openai", re.IGNORECASE),
    re.compile(r"gpt", re.IGNORECASE),
    re.compile(r"anthropic", re.IGNORECASE),
]

BOT_PATTERNS = [
    re.compile(r"kibanamachine", re.IGNORECASE),
    re.compile(r"elastic-renovate-prod\[bot\]", re.IGNORECASE),
    re.compile(r"elasticmachine", re.IGNORECASE),
    re.compile(r"renovate\[bot\]", re.IGNORECASE),
    re.compile(r"\[bot\]", re.IGNORECASE),
]

CO_AUTHOR_RE = re.compile(r"Co-authored-by:\s*(.+)", re.IGNORECASE)


def is_ai_co_author(name_email: str) -> bool:
    return any(p.search(name_email) for p in AI_CO_AUTHOR_PATTERNS)


def is_bot_author(name_email: str) -> bool:
    return any(p.search(name_email) for p in BOT_PATTERNS)


def extract_commits():
    """Run git log and parse output into structured data."""
    if OUTPUT_FILE.exists():
        print(f"Cache exists: {OUTPUT_FILE} — skipping extraction. Delete to re-run.")
        return

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    git_format = FIELD_SEP.join(["%H", "%an", "%ae", "%aI", "%s", "%b", "%N"])
    cmd = [
        "git", "log",
        f"--since={SINCE_DATE}",
        f"--format={SEP}{git_format}",
        "--shortstat",
    ]

    print(f"Running git log from {REPO_ROOT} (since {SINCE_DATE})...")
    result = subprocess.run(
        cmd, capture_output=True, text=True, cwd=REPO_ROOT
    )

    if result.returncode != 0:
        print(f"git log failed: {result.stderr}", file=sys.stderr)
        sys.exit(1)

    raw = result.stdout
    raw_commits = raw.split(SEP)

    rows = []
    stat_re = re.compile(
        r"(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?"
    )

    for block in raw_commits:
        block = block.strip()
        if not block:
            continue

        parts = block.split(FIELD_SEP, 6)
        if len(parts) < 5:
            continue

        commit_hash = parts[0].strip()
        author_name = parts[1].strip()
        author_email = parts[2].strip()
        date_str = parts[3].strip()
        subject = parts[4].strip()
        body = parts[5].strip() if len(parts) > 5 else ""
        notes = parts[6].strip() if len(parts) > 6 else ""

        # Parse co-authors
        co_authors = CO_AUTHOR_RE.findall(body + "\n" + notes)
        ai_co_authors = [ca for ca in co_authors if is_ai_co_author(ca)]
        has_ai_co_author = len(ai_co_authors) > 0
        is_bot = is_bot_author(f"{author_name} <{author_email}>")

        # Parse shortstat (appears after the format block)
        files_changed = 0
        insertions = 0
        deletions = 0
        stat_match = stat_re.search(block)
        if stat_match:
            files_changed = int(stat_match.group(1) or 0)
            insertions = int(stat_match.group(2) or 0)
            deletions = int(stat_match.group(3) or 0)

        # Extract PR number from subject (e.g., "... (#12345)")
        pr_match = re.search(r"\(#(\d+)\)\s*$", subject)
        pr_number = int(pr_match.group(1)) if pr_match else None

        rows.append({
            "hash": commit_hash,
            "author_name": author_name,
            "author_email": author_email,
            "date": date_str,
            "subject": subject,
            "pr_number": pr_number,
            "files_changed": files_changed,
            "insertions": insertions,
            "deletions": deletions,
            "has_ai_co_author": has_ai_co_author,
            "ai_co_authors": "; ".join(ai_co_authors),
            "is_bot": is_bot,
        })

    fieldnames = [
        "hash", "author_name", "author_email", "date", "subject",
        "pr_number", "files_changed", "insertions", "deletions",
        "has_ai_co_author", "ai_co_authors", "is_bot",
    ]

    with open(OUTPUT_FILE, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Extracted {len(rows)} commits to {OUTPUT_FILE}")
    print(f"  AI co-authored: {sum(1 for r in rows if r['has_ai_co_author'])}")
    print(f"  Bot commits: {sum(1 for r in rows if r['is_bot'])}")


if __name__ == "__main__":
    extract_commits()
