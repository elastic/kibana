#!/usr/bin/env python3
"""Fetch merged PRs from elastic/kibana via GitHub GraphQL API with cursor pagination."""

import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"
OUTPUT_FILE = DATA_DIR / "prs.json"
REPO_OWNER = "elastic"
REPO_NAME = "kibana"

AI_KEYWORDS = [
    "copilot", "claude", "ai-generated", "ai generated",
    "llm", "chatgpt", "gpt-4", "gpt4", "openai",
    "ai-assisted", "ai assisted", "github copilot",
    "claude code", "anthropic",
]

GRAPHQL_QUERY = """
query($queryString: String!, $cursor: String) {
  search(query: $queryString, type: ISSUE, first: 100, after: $cursor) {
    pageInfo {
      hasNextPage
      endCursor
    }
    nodes {
      ... on PullRequest {
        number
        title
        body
        author { login }
        createdAt
        mergedAt
        closedAt
        additions
        deletions
        labels(first: 30) {
          nodes { name }
        }
      }
    }
  }
}
"""


def has_ai_signal(text: str) -> bool:
    lower = text.lower()
    return any(kw in lower for kw in AI_KEYWORDS)


def run_graphql(query_string: str) -> list:
    """Fetch all pages for a given search query string."""
    all_nodes = []
    cursor = None

    while True:
        variables = {"queryString": query_string}
        if cursor:
            variables["cursor"] = cursor

        cmd = [
            "gh", "api", "graphql",
            "-f", f"query={GRAPHQL_QUERY}",
        ]
        for key, val in variables.items():
            cmd.extend(["-f", f"{key}={val}"])

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            print(f"  GraphQL error: {result.stderr}", file=sys.stderr)
            break

        data = json.loads(result.stdout)
        search = data.get("data", {}).get("search", {})
        nodes = search.get("nodes", [])
        all_nodes.extend(nodes)

        page_info = search.get("pageInfo", {})
        if page_info.get("hasNextPage") and page_info.get("endCursor"):
            cursor = page_info["endCursor"]
        else:
            break

    return all_nodes


def fetch_month(year: int, month: int) -> list:
    """Fetch all merged PRs for a given month."""
    next_year = year + (1 if month == 12 else 0)
    next_month = (month % 12) + 1
    query = (
        f"repo:{REPO_OWNER}/{REPO_NAME} is:pr is:merged "
        f"merged:{year}-{month:02d}-01..{next_year}-{next_month:02d}-01"
    )
    return run_graphql(query)


def fetch_prs():
    if OUTPUT_FILE.exists():
        print(f"Cache exists: {OUTPUT_FILE} — skipping. Delete to re-run.")
        return

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    all_prs = []
    current = datetime(2024, 10, 1)
    end = datetime(2026, 5, 1)

    while current < end:
        print(f"Fetching merged PRs for {current.year}-{current.month:02d}...")
        batch = fetch_month(current.year, current.month)
        print(f"  Found {len(batch)} PRs")
        all_prs.extend(batch)

        if current.month == 12:
            current = current.replace(year=current.year + 1, month=1)
        else:
            current = current.replace(month=current.month + 1)

    # Deduplicate by PR number
    seen = set()
    unique = []
    for pr in all_prs:
        num = pr.get("number")
        if num and num not in seen:
            seen.add(num)
            unique.append(pr)

    # Extract fields and detect AI signals
    processed = []
    for pr in unique:
        title = pr.get("title", "")
        body = pr.get("body", "") or ""
        labels = [lbl["name"] for lbl in pr.get("labels", {}).get("nodes", [])]

        processed.append({
            "number": pr["number"],
            "title": title,
            "author": pr.get("author", {}).get("login", "") if pr.get("author") else "",
            "created_at": pr.get("createdAt"),
            "closed_at": pr.get("closedAt"),
            "merged_at": pr.get("mergedAt"),
            "additions": pr.get("additions", 0),
            "deletions": pr.get("deletions", 0),
            "labels": labels,
            "has_ai_signal_title": has_ai_signal(title),
            "has_ai_signal_body": has_ai_signal(body),
            "has_ai_signal": has_ai_signal(title) or has_ai_signal(body),
        })

    with open(OUTPUT_FILE, "w") as f:
        json.dump(processed, f, indent=2, default=str)

    ai_count = sum(1 for p in processed if p["has_ai_signal"])
    print(f"\nSaved {len(processed)} merged PRs to {OUTPUT_FILE}")
    print(f"  With AI signal in title/body: {ai_count}")


if __name__ == "__main__":
    fetch_prs()
