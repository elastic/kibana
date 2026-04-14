#!/usr/bin/env python3
"""Classify git file changes as test vs production code and output monthly series."""

import json
import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path
from typing import Optional

DATA_DIR = Path(__file__).parent / "data"
OUTPUT_FILE = DATA_DIR / "test_coverage_proxy.json"
REPO_ROOT = Path(__file__).resolve().parents[3]
SINCE_DATE = "2024-10-01"

# Record separator
SEP = "---COMMIT_SEP---"
FIELD_SEP = "---FIELD_SEP---"

TEST_PATTERNS = [
    re.compile(r"\.test\.(ts|tsx|js|jsx)$"),
    re.compile(r"\.spec\.(ts|tsx|js|jsx)$"),
    re.compile(r"\.cy\.(ts|tsx|js)$"),
    re.compile(r"(^|/)__tests__/"),
    re.compile(r"(^|/)__mocks__/"),
    re.compile(r"(^|/)test/"),
    re.compile(r"(^|/)tests/"),
]

EXCLUDED_PATTERNS = [
    re.compile(r"\.(md|json|lock|yaml|yml)$"),
    re.compile(r"(^|/)docs/"),
    re.compile(r"(^|/)scripts/"),
    re.compile(r"(^|/)\.(eslint|prettier|babel|github|buildkite)"),
    re.compile(r"package\.json$"),
    re.compile(r"tsconfig.*\.json$"),
    re.compile(r"jest\.config"),
    re.compile(r"yarn\.lock$"),
    re.compile(r"\.gitignore$"),
]

SOURCE_PREFIXES = ["src/", "x-pack/", "packages/"]


def is_test_file(path: str) -> bool:
    return any(p.search(path) for p in TEST_PATTERNS)


def is_excluded(path: str) -> bool:
    return any(p.search(path) for p in EXCLUDED_PATTERNS)


def is_source_file(path: str) -> bool:
    return any(path.startswith(prefix) for prefix in SOURCE_PREFIXES)


def classify_file(path: str) -> Optional[str]:
    """Classify a file path as 'test', 'prod', or None (excluded/irrelevant)."""
    if is_excluded(path):
        return None
    if not is_source_file(path):
        return None
    if is_test_file(path):
        return "test"
    return "prod"


def collect():
    if OUTPUT_FILE.exists():
        print(f"Cache exists: {OUTPUT_FILE} — skipping. Delete to re-run.")
        return

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    git_format = FIELD_SEP.join(["%H", "%aI"])
    cmd = [
        "git", "log",
        f"--since={SINCE_DATE}",
        f"--format={SEP}{git_format}",
        "--numstat",
    ]

    print(f"Running git log --numstat from {REPO_ROOT} (since {SINCE_DATE})...")
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=REPO_ROOT)

    if result.returncode != 0:
        print(f"git log failed: {result.stderr}", file=sys.stderr)
        sys.exit(1)

    monthly = defaultdict(lambda: {
        "test_files_changed": 0,
        "prod_files_changed": 0,
        "test_lines_added": 0,
        "test_lines_deleted": 0,
        "prod_lines_added": 0,
        "prod_lines_deleted": 0,
    })

    # Track new/deleted files per month
    new_test_files = defaultdict(int)
    deleted_test_files = defaultdict(int)

    numstat_re = re.compile(r"^(\d+|-)\t(\d+|-)\t(.+)$")

    for block in result.stdout.split(SEP):
        block = block.strip()
        if not block:
            continue

        parts = block.split(FIELD_SEP, 1)
        if len(parts) < 2:
            continue

        date_str = parts[1].strip().split("\n")[0]
        try:
            month = date_str[:7]  # "YYYY-MM"
        except (IndexError, ValueError):
            continue

        for line in block.split("\n"):
            m = numstat_re.match(line.strip())
            if not m:
                continue

            added_str, deleted_str, filepath = m.group(1), m.group(2), m.group(3)

            # Binary files show "-" for added/deleted
            if added_str == "-" or deleted_str == "-":
                continue

            added = int(added_str)
            deleted = int(deleted_str)
            classification = classify_file(filepath)

            if classification == "test":
                monthly[month]["test_files_changed"] += 1
                monthly[month]["test_lines_added"] += added
                monthly[month]["test_lines_deleted"] += deleted
                # Heuristic: file is "new" if all lines are additions
                if added > 0 and deleted == 0:
                    new_test_files[month] += 1
                elif added == 0 and deleted > 0:
                    deleted_test_files[month] += 1
            elif classification == "prod":
                monthly[month]["prod_files_changed"] += 1
                monthly[month]["prod_lines_added"] += added
                monthly[month]["prod_lines_deleted"] += deleted

    # Compute ratios and finalize
    output = {}
    for month in sorted(monthly.keys()):
        d = monthly[month]
        prod_files = d["prod_files_changed"]
        prod_lines = d["prod_lines_added"]

        output[month] = {
            "test_files_changed": d["test_files_changed"],
            "prod_files_changed": prod_files,
            "test_lines_added": d["test_lines_added"],
            "test_lines_deleted": d["test_lines_deleted"],
            "prod_lines_added": prod_lines,
            "prod_lines_deleted": d["prod_lines_deleted"],
            "test_to_prod_ratio": round(d["test_files_changed"] / prod_files, 3) if prod_files > 0 else 0,
            "test_line_ratio": round(d["test_lines_added"] / prod_lines, 3) if prod_lines > 0 else 0,
            "new_test_files": new_test_files[month],
            "test_file_deletions": deleted_test_files[month],
        }

    with open(OUTPUT_FILE, "w") as f:
        json.dump(output, f, indent=2)

    print(f"Test coverage proxy saved to {OUTPUT_FILE}")
    months = sorted(output.keys())
    print(f"  Months: {len(months)} ({months[0]} to {months[-1]})")
    total_test = sum(d["test_files_changed"] for d in output.values())
    total_prod = sum(d["prod_files_changed"] for d in output.values())
    print(f"  Total test file changes: {total_test:,}")
    print(f"  Total prod file changes: {total_prod:,}")
    print(f"  Overall test-to-prod ratio: {total_test / total_prod:.3f}" if total_prod > 0 else "")


if __name__ == "__main__":
    collect()
