#!/usr/bin/env python3
"""
Initialize the Kibana repository for PR review.

Checks out the PR branch on a clean upstream/main base, fetches PR metadata
and diff, and optionally runs yarn kbn bootstrap.

Usage:
    python init_repo.py <pr_number>
    python init_repo.py <pr_number> --skip-bootstrap
    python init_repo.py <pr_number> --repo-dir /path/to/kibana
"""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

OWNER = "elastic"
REPO = "kibana"


def run(cmd, cwd=None, check=True):
    """Run a shell command, print it, and return the result."""
    print(f"  $ {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=cwd)
    if result.returncode != 0:
        if check:
            print(f"  ERROR: {result.stderr.strip()}", file=sys.stderr)
            sys.exit(1)
        else:
            print(f"  Warning: {result.stderr.strip()}")
    return result


def find_repo_root():
    """Walk up from script location to find the git repo root."""
    candidate = Path(__file__).resolve().parent
    while candidate != candidate.parent:
        if (candidate / ".git").exists():
            return str(candidate)
        candidate = candidate.parent
    return None


def main():
    parser = argparse.ArgumentParser(
        description="Initialize Kibana repo for PR review",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("pr_number", help="GitHub PR number")
    parser.add_argument(
        "--repo-dir",
        default=None,
        help="Path to kibana repo (default: auto-detect from script location)",
    )
    parser.add_argument(
        "--skip-bootstrap",
        action="store_true",
        help="Skip yarn kbn bootstrap step",
    )

    args = parser.parse_args()
    pr_number = args.pr_number

    # Resolve repo directory
    repo_dir = args.repo_dir or find_repo_root()
    if not repo_dir or not Path(repo_dir, ".git").exists():
        print("Error: Could not find git repo root. Use --repo-dir.", file=sys.stderr)
        sys.exit(1)

    # Create output directories
    output_dir = Path(repo_dir) / "tmp" / "prs" / pr_number
    output_dir.mkdir(parents=True, exist_ok=True)
    reports_dir = output_dir / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n{'='*50}")
    print(f"  Initializing repo for PR #{pr_number}")
    print(f"  Repo: {repo_dir}")
    print(f"  Output: {output_dir}")
    print(f"{'='*50}\n")

    # Step 1: Checkout main
    print("[1/8] Checking out main branch...")
    run(["git", "checkout", "main"], cwd=repo_dir)

    # Step 2: Fetch upstream
    print("[2/8] Fetching upstream...")
    run(["git", "fetch", "upstream"], cwd=repo_dir)

    # Step 3: Reset to upstream/main
    print("[3/8] Resetting to upstream/main...")
    run(["git", "reset", "--hard", "upstream/main"], cwd=repo_dir)

    # Step 4: Checkout the PR
    print(f"[4/8] Checking out PR #{pr_number}...")
    run(
        ["gh", "pr", "checkout", pr_number, "--repo", f"{OWNER}/{REPO}"],
        cwd=repo_dir,
    )

    # Step 5: Fetch PR metadata
    print("[5/8] Fetching PR metadata...")
    result = run(
        [
            "gh", "pr", "view", pr_number,
            "--repo", f"{OWNER}/{REPO}",
            "--json",
            "number,title,body,state,author,headRefName,baseRefName,"
            "commits,reviews,comments,files,labels,assignees,milestone,"
            "createdAt,updatedAt,mergedAt,closedAt,url,isDraft",
        ],
        cwd=repo_dir,
    )
    metadata = json.loads(result.stdout)
    metadata_path = output_dir / "metadata.json"
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"  Saved metadata to {metadata_path}")

    # Step 6: Fetch PR diff
    print("[6/8] Fetching PR diff...")
    result = run(
        ["gh", "pr", "diff", pr_number, "--repo", f"{OWNER}/{REPO}"],
        cwd=repo_dir,
    )
    diff_path = output_dir / "diff.patch"
    with open(diff_path, "w") as f:
        f.write(result.stdout)
    print(f"  Saved diff to {diff_path} ({len(result.stdout)} bytes)")

    # Step 7: Fetch PR comments
    print("[7/8] Fetching PR comments...")
    result = run(
        [
            "gh", "api",
            f"/repos/{OWNER}/{REPO}/pulls/{pr_number}/comments",
            "--paginate",
        ],
        cwd=repo_dir,
        check=False,
    )
    if result.returncode == 0 and result.stdout.strip():
        comments_path = output_dir / "comments.json"
        with open(comments_path, "w") as f:
            f.write(result.stdout)
        print(f"  Saved comments to {comments_path}")
    else:
        print("  No comments found or fetch failed (non-critical)")

    # Step 8: Yarn bootstrap
    if not args.skip_bootstrap:
        print("[8/8] Running yarn kbn bootstrap (this may take a while)...")
        run(["yarn", "kbn", "bootstrap"], cwd=repo_dir)
    else:
        print("[8/8] Skipping yarn kbn bootstrap (--skip-bootstrap)")

    # Print summary
    files = metadata.get("files", [])
    print(f"\n{'='*50}")
    print(f"  Setup complete for PR #{pr_number}")
    print(f"{'='*50}")
    print(f"  Title:   {metadata.get('title', 'N/A')}")
    print(f"  Author:  {metadata.get('author', {}).get('login', 'N/A')}")
    print(f"  Branch:  {metadata.get('headRefName', 'N/A')} -> {metadata.get('baseRefName', 'N/A')}")
    print(f"  State:   {metadata.get('state', 'N/A')}")
    print(f"  Files:   {len(files)}")
    print(f"  Output:  {output_dir}")
    print(f"  Reports: {reports_dir}")
    print()

    # List changed files for reference
    if files:
        print("Changed files:")
        for f in files:
            print(f"  {f.get('path', f.get('filename', 'unknown'))}")
        print()


if __name__ == "__main__":
    main()
