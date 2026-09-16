#!/usr/bin/env python3
"""
Fetch GitHub PR data using gh CLI and organize it for review.

Usage:
    python fetch_pr_data.py <pr_url> [--output-dir <dir>]

Example:
    python fetch_pr_data.py https://github.com/owner/repo/pull/123
    python fetch_pr_data.py https://github.com/owner/repo/pull/123 --output-dir tmp/custom
"""

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple


def parse_pr_url(pr_url: str) -> Tuple[str, str, str]:
    """
    Parse GitHub PR URL to extract owner, repo, and PR number.

    Args:
        pr_url: GitHub PR URL (e.g., https://github.com/owner/repo/pull/123)

    Returns:
        Tuple of (owner, repo, pr_number)

    Raises:
        ValueError: If URL format is invalid
    """
    pattern = r'github\.com/([^/]+)/([^/]+)/pull/(\d+)'
    match = re.search(pattern, pr_url)

    if not match:
        raise ValueError(f"Invalid GitHub PR URL: {pr_url}")

    return match.group(1), match.group(2), match.group(3)


def run_gh_command(args: List[str]) -> str:
    """
    Run gh CLI command and return output.

    Args:
        args: Command arguments to pass to gh

    Returns:
        Command output as string

    Raises:
        RuntimeError: If gh command fails
    """
    try:
        result = subprocess.run(
            ['gh'] + args,
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"gh command failed: {e.stderr}")
    except FileNotFoundError:
        raise RuntimeError("gh CLI not found. Please install: https://cli.github.com/")


def fetch_pr_metadata(owner: str, repo: str, pr_number: str) -> Dict:
    """Fetch PR metadata using gh pr view."""
    repo_spec = f"{owner}/{repo}"
    output = run_gh_command([
        'pr', 'view', pr_number,
        '--repo', repo_spec,
        '--json', 'number,title,body,state,author,headRefName,baseRefName,commits,reviews,comments,files,labels,assignees,milestone,createdAt,updatedAt,mergedAt,closedAt,url,isDraft'
    ])
    return json.loads(output)


def fetch_pr_diff(owner: str, repo: str, pr_number: str) -> str:
    """Fetch PR diff using gh pr diff."""
    repo_spec = f"{owner}/{repo}"
    return run_gh_command(['pr', 'diff', pr_number, '--repo', repo_spec])


def fetch_pr_comments(owner: str, repo: str, pr_number: str) -> List[Dict]:
    """Fetch PR review comments."""
    repo_spec = f"{owner}/{repo}"
    output = run_gh_command([
        'api',
        f'/repos/{owner}/{repo}/pulls/{pr_number}/comments',
        '--paginate'
    ])
    return json.loads(output)


def fetch_commits(owner: str, repo: str, pr_number: str) -> List[Dict]:
    """Fetch commit details for the PR."""
    repo_spec = f"{owner}/{repo}"
    output = run_gh_command([
        'api',
        f'/repos/{owner}/{repo}/pulls/{pr_number}/commits',
        '--paginate'
    ])
    return json.loads(output)


def extract_ticket_numbers(text: str) -> List[str]:
    """
    Extract ticket/issue numbers from text.
    Looks for patterns like: JIRA-123, #123, PROJ-456, etc.
    """
    patterns = [
        r'#(\d+)',  # GitHub issues: #123
        r'([A-Z]+-\d+)',  # JIRA style: PROJ-123
        r'([A-Z]{2,}-\d+)',  # Generic ticket: ABC-123
    ]

    tickets = []
    for pattern in patterns:
        matches = re.findall(pattern, text)
        tickets.extend(matches)

    return list(set(tickets))  # Remove duplicates


def fetch_github_issue(owner: str, repo: str, issue_number: str) -> Optional[Dict]:
    """Fetch GitHub issue details if it exists."""
    try:
        output = run_gh_command([
            'api',
            f'/repos/{owner}/{repo}/issues/{issue_number.lstrip("#")}'
        ])
        return json.loads(output)
    except RuntimeError:
        return None


def setup_pr_review_dir(base_dir: str, repo: str, pr_number: str) -> Path:
    """Create and return the PR review directory."""
    pr_review_dir = Path(base_dir) / 'prs' / pr_number
    pr_review_dir.mkdir(parents=True, exist_ok=True)
    return pr_review_dir


def clone_pr_branch(owner: str, repo: str, branch: str, target_dir: Path) -> None:
    """Clone the PR source branch into target directory."""
    repo_url = f"https://github.com/{owner}/{repo}.git"
    clone_dir = target_dir / "source"

    if clone_dir.exists():
        print(f"Repository already cloned at {clone_dir}, pulling latest...")
        subprocess.run(['git', '-C', str(clone_dir), 'pull'], check=True)
    else:
        print(f"Cloning {repo_url} branch {branch}...")
        subprocess.run([
            'git', 'clone',
            '--branch', branch,
            '--single-branch',
            repo_url,
            str(clone_dir)
        ], check=True)


def get_branch_diff(clone_dir: Path, base_branch: str, head_branch: str) -> str:
    """Get git diff between base and head branches."""
    # Fetch base branch if not already present
    subprocess.run([
        'git', '-C', str(clone_dir),
        'fetch', 'origin', f'{base_branch}:{base_branch}'
    ], check=False)  # Don't fail if branch exists

    result = subprocess.run([
        'git', '-C', str(clone_dir),
        'diff', f'origin/{base_branch}...{head_branch}'
    ], capture_output=True, text=True, check=True)

    return result.stdout


def save_data(pr_review_dir: Path, data: Dict) -> None:
    """Save all fetched data to JSON files in the PR review directory."""
    for filename, content in data.items():
        filepath = pr_review_dir / filename

        if filename.endswith('.json'):
            with open(filepath, 'w') as f:
                json.dump(content, f, indent=2)
        else:
            with open(filepath, 'w') as f:
                f.write(content)

        print(f"Saved: {filepath}")


def main():
    parser = argparse.ArgumentParser(
        description='Fetch GitHub PR data for code review',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument('pr_url', help='GitHub PR URL')
    parser.add_argument('--output-dir', default='tmp',
                       help='Base output directory (default: tmp)')
    parser.add_argument('--no-clone', action='store_true',
                       help='Skip cloning the repository')

    args = parser.parse_args()

    try:
        # Parse PR URL
        owner, repo, pr_number = parse_pr_url(args.pr_url)
        print(f"Fetching PR #{pr_number} from {owner}/{repo}...")

        # Setup review directory
        pr_review_dir = setup_pr_review_dir(args.output_dir, repo, pr_number)
        print(f"PR review directory: {pr_review_dir}")

        # Fetch PR metadata
        print("Fetching PR metadata...")
        metadata = fetch_pr_metadata(owner, repo, pr_number)

        # Fetch PR diff
        print("Fetching PR diff...")
        diff = fetch_pr_diff(owner, repo, pr_number)

        # Fetch comments
        print("Fetching PR comments...")
        comments = fetch_pr_comments(owner, repo, pr_number)

        # Fetch commits
        print("Fetching commit history...")
        commits = fetch_commits(owner, repo, pr_number)

        # Extract and fetch ticket information
        print("Extracting ticket references...")
        all_text = f"{metadata.get('title', '')} {metadata.get('body', '')}"
        for commit in commits:
            all_text += f" {commit.get('commit', {}).get('message', '')}"

        ticket_numbers = extract_ticket_numbers(all_text)
        related_issues = {}

        for ticket in ticket_numbers:
            if ticket.startswith('#') or ticket.isdigit():
                issue_num = ticket.lstrip('#')
                print(f"Fetching GitHub issue #{issue_num}...")
                issue = fetch_github_issue(owner, repo, issue_num)
                if issue:
                    related_issues[ticket] = issue

        # Clone repository and get diff (optional)
        git_diff = ""
        if not args.no_clone:
            try:
                print("Cloning repository...")
                clone_pr_branch(owner, repo, metadata['headRefName'], pr_review_dir)

                print("Generating git diff...")
                clone_dir = pr_review_dir / "source"
                git_diff = get_branch_diff(
                    clone_dir,
                    metadata['baseRefName'],
                    metadata['headRefName']
                )
            except Exception as e:
                print(f"Warning: Could not clone repository: {e}")

        # Save all data
        print("\nSaving data...")
        data = {
            'metadata.json': metadata,
            'diff.patch': diff,
            'comments.json': comments,
            'commits.json': commits,
            'related_issues.json': related_issues,
            'ticket_numbers.json': ticket_numbers,
        }

        if git_diff:
            data['git_diff.patch'] = git_diff

        save_data(pr_review_dir, data)

        # Create summary file
        summary = f"""PR Review Summary
==================

Repository: {owner}/{repo}
PR Number: #{pr_number}
Title: {metadata.get('title', 'N/A')}
Author: {metadata.get('author', {}).get('login', 'N/A')}
State: {metadata.get('state', 'N/A')}
Draft: {metadata.get('isDraft', False)}

Branches:
  Source: {metadata.get('headRefName', 'N/A')}
  Target: {metadata.get('baseRefName', 'N/A')}

Files Changed: {len(metadata.get('files', []))}
Commits: {len(commits)}
Comments: {len(comments)}
Reviews: {len(metadata.get('reviews', []))}

Related Tickets:
{chr(10).join(f"  - {ticket}" for ticket in ticket_numbers) if ticket_numbers else "  None found"}

Review Directory: {pr_review_dir}
"""

        summary_file = pr_review_dir / 'SUMMARY.txt'
        with open(summary_file, 'w') as f:
            f.write(summary)

        print(f"\n{summary}")
        print(f"\nAll data saved to: {pr_review_dir}")

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
