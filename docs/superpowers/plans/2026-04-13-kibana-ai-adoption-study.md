# Kibana AI Adoption Impact Study — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build exploratory scripts that analyze 18 months of elastic/kibana GitHub data to study correlation between AI tool adoption, release speed, and bug patterns.

**Architecture:** Local git log extraction for commit data + GitHub API (via `gh` CLI) for PR/issue metadata. Data joined into a single dataset, then analyzed with pandas and visualized with matplotlib/seaborn. All API responses cached to JSON.

**Tech Stack:** Python 3, pandas, matplotlib, seaborn, `gh` CLI, git

---

## File Structure

```
docs/superpowers/kibana-ai-study/
├── requirements.txt              # Python dependencies
├── .gitignore                    # Ignore data/ and output/ directories
├── collect_git_data.py           # Git log → data/commits.csv
├── collect_github_prs.py         # GitHub API → data/prs.json
├── collect_github_issues.py      # GitHub API → data/issues.json
├── join_data.py                  # Merge commits + PRs + issues → data/joined.csv
├── analyze.py                    # Compute metrics → data/metrics.json
├── visualize.py                  # Generate charts → output/charts/*.png
├── generate_summary.py           # Write output/summary.md from metrics
├── NEXT_STEPS.md                 # Future improvements (Phase C)
├── data/                         # Raw + joined data (gitignored)
└── output/                       # Charts + summary (gitignored)
    └── charts/
```

---

### Task 1: Project Setup

**Files:**
- Create: `docs/superpowers/kibana-ai-study/requirements.txt`
- Create: `docs/superpowers/kibana-ai-study/.gitignore`
- Create: `docs/superpowers/kibana-ai-study/NEXT_STEPS.md`

- [ ] **Step 1: Create project directory and data/output subdirectories**

```bash
mkdir -p docs/superpowers/kibana-ai-study/data
mkdir -p docs/superpowers/kibana-ai-study/output/charts
```

- [ ] **Step 2: Create requirements.txt**

Create `docs/superpowers/kibana-ai-study/requirements.txt`:

```
pandas>=2.0
matplotlib>=3.7
seaborn>=0.12
```

- [ ] **Step 3: Create .gitignore**

Create `docs/superpowers/kibana-ai-study/.gitignore`:

```
data/
output/
__pycache__/
*.pyc
.venv/
```

- [ ] **Step 4: Create NEXT_STEPS.md**

Create `docs/superpowers/kibana-ai-study/NEXT_STEPS.md`:

```markdown
# Future Improvements

## Phase C — Elasticsearch/Kibana Pipeline
- Ingest `data/joined.csv` into Elasticsearch using the Bulk API or Filebeat
- Build Kibana dashboards with interactive filters: author, time range, label, AI signal
- Enable ongoing ingestion via scheduled script runs (cron or Kibana task)

## Richer AI Signal Detection
- Analyze commit message patterns (e.g., generated-looking messages)
- Correlate diff sizes with AI signals
- Look for code style markers that may indicate AI-assisted code

## Deeper Bug Impact Analysis
- Link bugs to specific files/areas of the codebase
- Compare bug density in AI-heavy vs non-AI areas of the code

## Per-Team/Area Breakdown
- Segment metrics by codebase area (platform, solutions, packages)
- Track if AI adoption varies across teams using commit paths

## Automated Refresh
- Cron-based script to pull new data weekly and regenerate charts
- Incremental data collection (only fetch new PRs/issues since last run)
```

- [ ] **Step 5: Install Python dependencies**

```bash
cd docs/superpowers/kibana-ai-study && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
```

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/kibana-ai-study/requirements.txt docs/superpowers/kibana-ai-study/.gitignore docs/superpowers/kibana-ai-study/NEXT_STEPS.md
git commit -m "chore: scaffold kibana-ai-study project structure"
```

---

### Task 2: Git Log Extraction

**Files:**
- Create: `docs/superpowers/kibana-ai-study/collect_git_data.py`

**Context:** The repo has ~22K commits in the last 18 months. Commits have `Co-authored-by` trailers in the body. Known AI co-authors include:
- `Copilot <175728472+Copilot@users.noreply.github.com>`
- `copilot-swe-agent[bot] <198982749+Copilot@users.noreply.github.com>`
- `Claude Opus 4.6 (1M context) <noreply@anthropic.com>`
- `Claude Sonnet 4.6 <noreply@anthropic.com>`

Known bots to flag (not AI-assisted, but automated):
- `kibanamachine <42973632+kibanamachine@users.noreply.github.com>`
- `elastic-renovate-prod[bot]`
- `elasticmachine`

- [ ] **Step 1: Create collect_git_data.py**

Create `docs/superpowers/kibana-ai-study/collect_git_data.py`:

```python
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
```

- [ ] **Step 2: Run the script and verify output**

```bash
cd docs/superpowers/kibana-ai-study && source .venv/bin/activate && python collect_git_data.py
```

Expected: Prints extraction summary (~22K commits), creates `data/commits.csv`. Verify with:

```bash
head -3 data/commits.csv
wc -l data/commits.csv
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/kibana-ai-study/collect_git_data.py
git commit -m "feat(ai-study): add git log extraction script"
```

---

### Task 3: GitHub PR Collection

**Files:**
- Create: `docs/superpowers/kibana-ai-study/collect_github_prs.py`

**Context:** The GitHub REST API returns max 100 items per page. For 18 months of elastic/kibana, expect several thousand merged PRs. Use `gh api --paginate` which handles pagination automatically. We need to filter by merged date >= 2024-10-01.

- [ ] **Step 1: Create collect_github_prs.py**

Create `docs/superpowers/kibana-ai-study/collect_github_prs.py`:

```python
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
```

- [ ] **Step 2: Run the script and verify output**

```bash
cd docs/superpowers/kibana-ai-study && source .venv/bin/activate && python collect_github_prs.py
```

Expected: Fetches PRs month by month (will take a few minutes due to API pagination), creates `data/prs.json`. Verify:

```bash
python -c "import json; d=json.load(open('data/prs.json')); print(f'{len(d)} PRs loaded')"
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/kibana-ai-study/collect_github_prs.py
git commit -m "feat(ai-study): add GitHub PR collection script"
```

---

### Task 4: GitHub Bug Issue Collection

**Files:**
- Create: `docs/superpowers/kibana-ai-study/collect_github_issues.py`

**Context:** Bug issues use the `bug` label. Same pagination strategy as PRs — query by month to stay under search API limits.

- [ ] **Step 1: Create collect_github_issues.py**

Create `docs/superpowers/kibana-ai-study/collect_github_issues.py`:

```python
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
```

- [ ] **Step 2: Run the script and verify output**

```bash
cd docs/superpowers/kibana-ai-study && source .venv/bin/activate && python collect_github_issues.py
```

Expected: Fetches bug issues month by month, creates `data/issues.json`. Verify:

```bash
python -c "import json; d=json.load(open('data/issues.json')); print(f'{len(d)} bug issues loaded')"
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/kibana-ai-study/collect_github_issues.py
git commit -m "feat(ai-study): add GitHub bug issue collection script"
```

---

### Task 5: Data Joining

**Files:**
- Create: `docs/superpowers/kibana-ai-study/join_data.py`

**Context:** Commits reference PR numbers in their subject line (e.g., `(#12345)`). PRs link to issues via labels or cross-references. The join script merges commits with their PR metadata and links bug issues to fix PRs.

- [ ] **Step 1: Create join_data.py**

Create `docs/superpowers/kibana-ai-study/join_data.py`:

```python
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
```

- [ ] **Step 2: Run the script and verify output**

```bash
cd docs/superpowers/kibana-ai-study && source .venv/bin/activate && python join_data.py
```

Expected: Prints join summary, creates `data/joined.csv` and `data/issues_enriched.csv`. Verify:

```bash
head -2 data/joined.csv
wc -l data/joined.csv
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/kibana-ai-study/join_data.py
git commit -m "feat(ai-study): add data joining script"
```

---

### Task 6: Metrics Analysis

**Files:**
- Create: `docs/superpowers/kibana-ai-study/analyze.py`

**Context:** Computes all metrics defined in the spec: PR cycle time, PR throughput, commit velocity, PR size trends, bug volume, bug resolution time, bug severity distribution, and AI signal rates. Bug-to-total ratio and bug reopen rate are deferred to Phase C (see Limitations). Outputs a JSON file with monthly/weekly aggregated metrics.

- [ ] **Step 1: Create analyze.py**

Create `docs/superpowers/kibana-ai-study/analyze.py`:

```python
#!/usr/bin/env python3
"""Compute metrics from joined data."""

import json
from pathlib import Path

import numpy as np
import pandas as pd

DATA_DIR = Path(__file__).parent / "data"
JOINED_FILE = DATA_DIR / "joined.csv"
ISSUES_FILE = DATA_DIR / "issues_enriched.csv"
PRS_FILE = DATA_DIR / "prs.json"
OUTPUT_FILE = DATA_DIR / "metrics.json"


def load_joined() -> pd.DataFrame:
    df = pd.read_csv(JOINED_FILE)
    df["date"] = pd.to_datetime(df["date"], utc=True)
    df["month"] = df["date"].dt.to_period("M")
    df["week"] = df["date"].dt.to_period("W")
    df["is_bot"] = df["is_bot"].fillna(False).astype(bool)
    df["ai_assisted"] = df["ai_assisted"].fillna(False).astype(bool)
    df["has_ai_co_author"] = df["has_ai_co_author"].fillna(False).astype(bool)
    return df


def load_prs() -> pd.DataFrame:
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
    df["has_ai_signal"] = df["has_ai_signal"].fillna(False).astype(bool)
    return df


def load_issues() -> pd.DataFrame:
    df = pd.read_csv(ISSUES_FILE)
    df["created_at"] = pd.to_datetime(df["created_at"], utc=True)
    df["closed_at"] = pd.to_datetime(df["closed_at"], utc=True, errors="coerce")
    df["month"] = df["created_at"].dt.to_period("M")
    df["resolution_time_hours"] = pd.to_numeric(
        df["resolution_time_hours"], errors="coerce"
    )
    return df


def percentiles(series: pd.Series) -> dict:
    s = series.dropna()
    if len(s) == 0:
        return {"p50": None, "p75": None, "p95": None, "mean": None}
    return {
        "p50": float(np.percentile(s, 50)),
        "p75": float(np.percentile(s, 75)),
        "p95": float(np.percentile(s, 95)),
        "mean": float(s.mean()),
    }


def analyze():
    if OUTPUT_FILE.exists():
        print(f"Cache exists: {OUTPUT_FILE} — skipping. Delete to re-run.")
        return

    commits = load_joined()
    prs = load_prs()
    issues = load_issues()

    # Filter out bot commits for human metrics
    human_commits = commits[~commits["is_bot"]]

    metrics = {"monthly": {}, "summary": {}}

    months = sorted(human_commits["month"].unique())

    for month in months:
        m_str = str(month)
        mc = human_commits[human_commits["month"] == month]
        mp = prs[prs["month"] == month]
        mi = issues[issues["month"] == month]

        # --- Release Speed Metrics ---
        pr_cycle = percentiles(mp["cycle_time_hours"])
        pr_throughput = len(mp)
        commit_count = len(mc)
        unique_authors = mc["author_email"].nunique()
        commits_per_author = commit_count / unique_authors if unique_authors > 0 else 0

        pr_sizes = mc[mc["pr_number"].notna()]
        avg_lines = float(
            (pr_sizes["insertions"] + pr_sizes["deletions"]).mean()
        ) if len(pr_sizes) > 0 else 0

        # --- Bug Metrics ---
        bug_count = len(mi)
        closed_issues = mi[mi["closed_at"].notna()]
        bug_resolution = percentiles(closed_issues["resolution_time_hours"])

        # Bug severity distribution
        severity_counts = mi["severity"].value_counts().to_dict()

        # --- AI Signal Metrics ---
        ai_commit_count = mc["ai_assisted"].sum()
        ai_commit_rate = float(ai_commit_count / len(mc)) if len(mc) > 0 else 0

        ai_pr_count = mp["has_ai_signal"].sum()
        ai_pr_rate = float(ai_pr_count / len(mp)) if len(mp) > 0 else 0

        # AI vs non-AI PR comparison
        ai_prs = mp[mp["has_ai_signal"]]
        non_ai_prs = mp[~mp["has_ai_signal"]]

        metrics["monthly"][m_str] = {
            "pr_cycle_time": pr_cycle,
            "pr_throughput": pr_throughput,
            "commit_count": commit_count,
            "unique_authors": unique_authors,
            "commits_per_author": round(commits_per_author, 1),
            "avg_pr_lines_changed": round(avg_lines, 0),
            "bug_count": bug_count,
            "bug_resolution_time": bug_resolution,
            "bug_severity": severity_counts,
            "ai_commit_count": int(ai_commit_count),
            "ai_commit_rate": round(ai_commit_rate, 4),
            "ai_pr_count": int(ai_pr_count),
            "ai_pr_rate": round(ai_pr_rate, 4),
            "ai_pr_cycle_time": percentiles(ai_prs["cycle_time_hours"]),
            "non_ai_pr_cycle_time": percentiles(non_ai_prs["cycle_time_hours"]),
        }

    # --- Summary Stats ---
    metrics["summary"] = {
        "total_commits": len(human_commits),
        "total_prs": len(prs),
        "total_bug_issues": len(issues),
        "total_ai_commits": int(human_commits["ai_assisted"].sum()),
        "overall_ai_commit_rate": round(
            float(human_commits["ai_assisted"].mean()), 4
        ),
        "overall_pr_cycle_time": percentiles(prs["cycle_time_hours"]),
        "overall_bug_resolution_time": percentiles(
            issues["resolution_time_hours"]
        ),
        "months_covered": len(months),
        "date_range": f"{months[0]} to {months[-1]}",
    }

    with open(OUTPUT_FILE, "w") as f:
        json.dump(metrics, f, indent=2, default=str)

    print(f"Metrics computed and saved to {OUTPUT_FILE}")
    print(f"  Months: {len(months)}")
    print(f"  Total commits (human): {metrics['summary']['total_commits']}")
    print(f"  Total PRs: {metrics['summary']['total_prs']}")
    print(f"  Total bug issues: {metrics['summary']['total_bug_issues']}")
    print(f"  AI commit rate: {metrics['summary']['overall_ai_commit_rate']:.1%}")


if __name__ == "__main__":
    analyze()
```

- [ ] **Step 2: Run the script and verify output**

```bash
cd docs/superpowers/kibana-ai-study && source .venv/bin/activate && python analyze.py
```

Expected: Prints metrics summary, creates `data/metrics.json`. Verify:

```bash
python -c "import json; m=json.load(open('data/metrics.json')); print(json.dumps(m['summary'], indent=2))"
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/kibana-ai-study/analyze.py
git commit -m "feat(ai-study): add metrics analysis script"
```

---

### Task 7: Visualization

**Files:**
- Create: `docs/superpowers/kibana-ai-study/visualize.py`

**Context:** Generates static PNG charts from the metrics JSON. One chart per key metric, plus correlation overlay charts showing AI adoption rate alongside speed/bug metrics.

- [ ] **Step 1: Create visualize.py**

Create `docs/superpowers/kibana-ai-study/visualize.py`:

```python
#!/usr/bin/env python3
"""Generate charts from computed metrics."""

import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")  # Non-interactive backend
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import seaborn as sns

CHARTS_DIR = Path(__file__).parent / "output" / "charts"
METRICS_FILE = Path(__file__).parent / "data" / "metrics.json"

sns.set_theme(style="whitegrid", palette="muted")
FIGSIZE = (14, 6)
AI_COLOR = "#E63946"
MAIN_COLOR = "#457B9D"
BUG_COLOR = "#F4A261"
SECONDARY_COLOR = "#2A9D8F"


def load_metrics() -> dict:
    with open(METRICS_FILE) as f:
        return json.load(f)


def get_monthly_series(metrics: dict, key: str) -> tuple[list, list]:
    """Extract a monthly time series from metrics."""
    monthly = metrics["monthly"]
    months = sorted(monthly.keys())
    values = []
    for m in months:
        val = monthly[m].get(key)
        if isinstance(val, dict):
            val = val.get("p50")
        values.append(val)
    return months, values


def plot_pr_cycle_time(metrics: dict):
    monthly = metrics["monthly"]
    months = sorted(monthly.keys())
    p50 = [monthly[m]["pr_cycle_time"]["p50"] for m in months]
    p75 = [monthly[m]["pr_cycle_time"]["p75"] for m in months]
    p95 = [monthly[m]["pr_cycle_time"]["p95"] for m in months]

    fig, ax = plt.subplots(figsize=FIGSIZE)
    ax.plot(months, p50, marker="o", label="p50", color=MAIN_COLOR, linewidth=2)
    ax.plot(months, p75, marker="s", label="p75", color=SECONDARY_COLOR, linewidth=1.5)
    ax.plot(months, p95, marker="^", label="p95", color=BUG_COLOR, linewidth=1, alpha=0.7)
    ax.set_title("PR Cycle Time (hours) — Creation to Merge", fontsize=14)
    ax.set_xlabel("Month")
    ax.set_ylabel("Hours")
    ax.legend()
    ax.tick_params(axis="x", rotation=45)
    fig.tight_layout()
    fig.savefig(CHARTS_DIR / "pr_cycle_time.png", dpi=150)
    plt.close()
    print("  Created: pr_cycle_time.png")


def plot_pr_throughput(metrics: dict):
    months, values = get_monthly_series(metrics, "pr_throughput")

    fig, ax = plt.subplots(figsize=FIGSIZE)
    ax.bar(months, values, color=MAIN_COLOR, alpha=0.8)
    ax.set_title("Merged PRs per Month", fontsize=14)
    ax.set_xlabel("Month")
    ax.set_ylabel("Count")
    ax.tick_params(axis="x", rotation=45)
    fig.tight_layout()
    fig.savefig(CHARTS_DIR / "pr_throughput.png", dpi=150)
    plt.close()
    print("  Created: pr_throughput.png")


def plot_commit_velocity(metrics: dict):
    months, commits = get_monthly_series(metrics, "commit_count")
    _, per_author = get_monthly_series(metrics, "commits_per_author")

    fig, ax1 = plt.subplots(figsize=FIGSIZE)
    ax2 = ax1.twinx()

    ax1.bar(months, commits, color=MAIN_COLOR, alpha=0.6, label="Total commits")
    ax2.plot(months, per_author, color=AI_COLOR, marker="o", linewidth=2,
             label="Per author avg")

    ax1.set_title("Commit Velocity", fontsize=14)
    ax1.set_xlabel("Month")
    ax1.set_ylabel("Total Commits", color=MAIN_COLOR)
    ax2.set_ylabel("Commits per Author", color=AI_COLOR)

    lines1, labels1 = ax1.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    ax1.legend(lines1 + lines2, labels1 + labels2, loc="upper left")
    ax1.tick_params(axis="x", rotation=45)
    fig.tight_layout()
    fig.savefig(CHARTS_DIR / "commit_velocity.png", dpi=150)
    plt.close()
    print("  Created: commit_velocity.png")


def plot_pr_size_trends(metrics: dict):
    months, values = get_monthly_series(metrics, "avg_pr_lines_changed")

    fig, ax = plt.subplots(figsize=FIGSIZE)
    ax.plot(months, values, marker="o", color=MAIN_COLOR, linewidth=2)
    ax.set_title("Average Lines Changed per PR", fontsize=14)
    ax.set_xlabel("Month")
    ax.set_ylabel("Lines (insertions + deletions)")
    ax.tick_params(axis="x", rotation=45)
    fig.tight_layout()
    fig.savefig(CHARTS_DIR / "pr_size_trends.png", dpi=150)
    plt.close()
    print("  Created: pr_size_trends.png")


def plot_bug_volume(metrics: dict):
    months, values = get_monthly_series(metrics, "bug_count")

    fig, ax = plt.subplots(figsize=FIGSIZE)
    ax.bar(months, values, color=BUG_COLOR, alpha=0.8)
    ax.set_title("Bug Issues Opened per Month", fontsize=14)
    ax.set_xlabel("Month")
    ax.set_ylabel("Count")
    ax.tick_params(axis="x", rotation=45)
    fig.tight_layout()
    fig.savefig(CHARTS_DIR / "bug_volume.png", dpi=150)
    plt.close()
    print("  Created: bug_volume.png")


def plot_bug_severity(metrics: dict):
    monthly = metrics["monthly"]
    months = sorted(monthly.keys())
    severities = ["critical", "high", "medium", "low", "unknown"]
    colors = {"critical": "#E63946", "high": "#F4A261", "medium": "#E9C46A",
              "low": "#2A9D8F", "unknown": "#ADB5BD"}

    data = {sev: [] for sev in severities}
    for m in months:
        sev_data = monthly[m].get("bug_severity", {})
        for sev in severities:
            data[sev].append(sev_data.get(sev, 0))

    fig, ax = plt.subplots(figsize=FIGSIZE)
    bottom = [0] * len(months)
    for sev in severities:
        vals = data[sev]
        ax.bar(months, vals, bottom=bottom, label=sev, color=colors[sev], alpha=0.85)
        bottom = [b + v for b, v in zip(bottom, vals)]

    ax.set_title("Bug Severity Distribution Over Time", fontsize=14)
    ax.set_xlabel("Month")
    ax.set_ylabel("Count")
    ax.legend()
    ax.tick_params(axis="x", rotation=45)
    fig.tight_layout()
    fig.savefig(CHARTS_DIR / "bug_severity.png", dpi=150)
    plt.close()
    print("  Created: bug_severity.png")


def plot_bug_resolution_time(metrics: dict):
    monthly = metrics["monthly"]
    months = sorted(monthly.keys())
    p50 = [monthly[m]["bug_resolution_time"]["p50"] for m in months]
    p75 = [monthly[m]["bug_resolution_time"]["p75"] for m in months]

    fig, ax = plt.subplots(figsize=FIGSIZE)
    ax.plot(months, p50, marker="o", label="p50", color=BUG_COLOR, linewidth=2)
    ax.plot(months, p75, marker="s", label="p75", color=AI_COLOR, linewidth=1.5)
    ax.set_title("Bug Resolution Time (hours)", fontsize=14)
    ax.set_xlabel("Month")
    ax.set_ylabel("Hours")
    ax.legend()
    ax.tick_params(axis="x", rotation=45)
    fig.tight_layout()
    fig.savefig(CHARTS_DIR / "bug_resolution_time.png", dpi=150)
    plt.close()
    print("  Created: bug_resolution_time.png")


def plot_ai_adoption_rate(metrics: dict):
    months, commit_rate = get_monthly_series(metrics, "ai_commit_rate")
    _, pr_rate = get_monthly_series(metrics, "ai_pr_rate")

    # Convert to percentages
    commit_pct = [r * 100 if r else 0 for r in commit_rate]
    pr_pct = [r * 100 if r else 0 for r in pr_rate]

    fig, ax = plt.subplots(figsize=FIGSIZE)
    ax.plot(months, commit_pct, marker="o", label="AI co-authored commits %",
            color=AI_COLOR, linewidth=2)
    ax.plot(months, pr_pct, marker="s", label="AI-mentioned PRs %",
            color=MAIN_COLOR, linewidth=2)
    ax.set_title("AI Adoption Rate Over Time", fontsize=14)
    ax.set_xlabel("Month")
    ax.set_ylabel("Percentage (%)")
    ax.legend()
    ax.tick_params(axis="x", rotation=45)
    fig.tight_layout()
    fig.savefig(CHARTS_DIR / "ai_adoption_rate.png", dpi=150)
    plt.close()
    print("  Created: ai_adoption_rate.png")


def plot_ai_vs_non_ai_cycle_time(metrics: dict):
    monthly = metrics["monthly"]
    months = sorted(monthly.keys())

    ai_p50 = []
    non_ai_p50 = []
    for m in months:
        ai_val = monthly[m]["ai_pr_cycle_time"]["p50"]
        non_ai_val = monthly[m]["non_ai_pr_cycle_time"]["p50"]
        ai_p50.append(ai_val)
        non_ai_p50.append(non_ai_val)

    fig, ax = plt.subplots(figsize=FIGSIZE)
    ax.plot(months, ai_p50, marker="o", label="AI-signal PRs (p50)",
            color=AI_COLOR, linewidth=2)
    ax.plot(months, non_ai_p50, marker="s", label="Non-AI PRs (p50)",
            color=MAIN_COLOR, linewidth=2)
    ax.set_title("PR Cycle Time: AI-Signal vs Non-AI (p50 hours)", fontsize=14)
    ax.set_xlabel("Month")
    ax.set_ylabel("Hours")
    ax.legend()
    ax.tick_params(axis="x", rotation=45)
    fig.tight_layout()
    fig.savefig(CHARTS_DIR / "ai_vs_non_ai_cycle_time.png", dpi=150)
    plt.close()
    print("  Created: ai_vs_non_ai_cycle_time.png")


def plot_correlation_overlay(metrics: dict):
    """Overlay AI adoption rate with PR cycle time and bug count."""
    months, ai_rate = get_monthly_series(metrics, "ai_commit_rate")
    _, cycle_p50 = get_monthly_series(metrics, "pr_cycle_time")
    _, bug_count = get_monthly_series(metrics, "bug_count")

    ai_pct = [r * 100 if r else 0 for r in ai_rate]

    fig, ax1 = plt.subplots(figsize=FIGSIZE)
    ax2 = ax1.twinx()

    ax1.fill_between(range(len(months)), ai_pct, alpha=0.2, color=AI_COLOR,
                     label="AI adoption %")
    ax1.plot(range(len(months)), ai_pct, color=AI_COLOR, linewidth=2)

    ax2.plot(range(len(months)), cycle_p50, marker="o", color=MAIN_COLOR,
             linewidth=2, label="PR cycle time p50 (h)")
    ax2.plot(range(len(months)), bug_count, marker="s", color=BUG_COLOR,
             linewidth=2, label="Bug count")

    ax1.set_xticks(range(len(months)))
    ax1.set_xticklabels(months, rotation=45)
    ax1.set_xlabel("Month")
    ax1.set_ylabel("AI Adoption %", color=AI_COLOR)
    ax2.set_ylabel("PR Cycle Time (h) / Bug Count")

    lines1, labels1 = ax1.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    ax1.legend(lines1 + lines2, labels1 + labels2, loc="upper left")

    ax1.set_title("Correlation: AI Adoption vs Speed & Bugs", fontsize=14)
    fig.tight_layout()
    fig.savefig(CHARTS_DIR / "correlation_overlay.png", dpi=150)
    plt.close()
    print("  Created: correlation_overlay.png")


def main():
    CHARTS_DIR.mkdir(parents=True, exist_ok=True)
    metrics = load_metrics()

    print("Generating charts...")
    plot_pr_cycle_time(metrics)
    plot_pr_throughput(metrics)
    plot_commit_velocity(metrics)
    plot_pr_size_trends(metrics)
    plot_bug_volume(metrics)
    plot_bug_severity(metrics)
    plot_bug_resolution_time(metrics)
    plot_ai_adoption_rate(metrics)
    plot_ai_vs_non_ai_cycle_time(metrics)
    plot_correlation_overlay(metrics)
    print(f"All charts saved to {CHARTS_DIR}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run the script and verify output**

```bash
cd docs/superpowers/kibana-ai-study && source .venv/bin/activate && python visualize.py
```

Expected: Creates 9 PNG charts in `output/charts/`. Verify:

```bash
ls -la output/charts/
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/kibana-ai-study/visualize.py
git commit -m "feat(ai-study): add visualization script with 10 chart types"
```

---

### Task 8: Summary Report Generation

**Files:**
- Create: `docs/superpowers/kibana-ai-study/generate_summary.py`

**Context:** Reads the computed metrics JSON and generates a Markdown summary with embedded chart references and key findings.

- [ ] **Step 1: Create generate_summary.py**

Create `docs/superpowers/kibana-ai-study/generate_summary.py`:

```python
#!/usr/bin/env python3
"""Generate a Markdown summary report from computed metrics."""

import json
from pathlib import Path

METRICS_FILE = Path(__file__).parent / "data" / "metrics.json"
OUTPUT_FILE = Path(__file__).parent / "output" / "summary.md"


def fmt_hours(h) -> str:
    if h is None:
        return "N/A"
    if h < 24:
        return f"{h:.1f}h"
    days = h / 24
    return f"{days:.1f}d"


def fmt_pct(rate) -> str:
    if rate is None:
        return "N/A"
    return f"{rate * 100:.1f}%"


def generate():
    with open(METRICS_FILE) as f:
        metrics = json.load(f)

    s = metrics["summary"]
    monthly = metrics["monthly"]
    months = sorted(monthly.keys())

    # Compute trends (first 3 months vs last 3 months)
    early_months = months[:3]
    late_months = months[-3:]

    def avg_metric(month_list, key, subkey=None):
        vals = []
        for m in month_list:
            v = monthly[m].get(key)
            if subkey and isinstance(v, dict):
                v = v.get(subkey)
            if v is not None:
                vals.append(v)
        return sum(vals) / len(vals) if vals else None

    early_cycle = avg_metric(early_months, "pr_cycle_time", "p50")
    late_cycle = avg_metric(late_months, "pr_cycle_time", "p50")
    early_throughput = avg_metric(early_months, "pr_throughput")
    late_throughput = avg_metric(late_months, "pr_throughput")
    early_bugs = avg_metric(early_months, "bug_count")
    late_bugs = avg_metric(late_months, "bug_count")
    early_resolution = avg_metric(early_months, "bug_resolution_time", "p50")
    late_resolution = avg_metric(late_months, "bug_resolution_time", "p50")
    early_ai = avg_metric(early_months, "ai_commit_rate")
    late_ai = avg_metric(late_months, "ai_commit_rate")

    def trend_arrow(early, late):
        if early is None or late is None:
            return ""
        pct = ((late - early) / early) * 100 if early != 0 else 0
        arrow = "up" if pct > 0 else "down"
        return f"{arrow} {abs(pct):.0f}%"

    output_dir = OUTPUT_FILE.parent
    output_dir.mkdir(parents=True, exist_ok=True)

    report = f"""# Kibana AI Adoption Impact Study — Findings

**Repository:** elastic/kibana
**Period:** {s['date_range']}
**Generated from:** {s['total_commits']:,} commits, {s['total_prs']:,} PRs, {s['total_bug_issues']:,} bug issues

---

## Key Numbers

| Metric | Value |
|--------|-------|
| Total human commits | {s['total_commits']:,} |
| Total merged PRs | {s['total_prs']:,} |
| Total bug issues | {s['total_bug_issues']:,} |
| AI-assisted commits | {s['total_ai_commits']:,} ({fmt_pct(s['overall_ai_commit_rate'])}) |
| Overall PR cycle time (p50) | {fmt_hours(s['overall_pr_cycle_time']['p50'])} |
| Overall bug resolution (p50) | {fmt_hours(s['overall_bug_resolution_time']['p50'])} |

---

## Trends: Early Period vs Late Period

Comparing the first 3 months ({', '.join(early_months)}) to the last 3 months ({', '.join(late_months)}):

| Metric | Early | Late | Change |
|--------|-------|------|--------|
| PR cycle time (p50) | {fmt_hours(early_cycle)} | {fmt_hours(late_cycle)} | {trend_arrow(early_cycle, late_cycle)} |
| PR throughput/month | {early_throughput:.0f} | {late_throughput:.0f} | {trend_arrow(early_throughput, late_throughput)} |
| Bug issues/month | {early_bugs:.0f} | {late_bugs:.0f} | {trend_arrow(early_bugs, late_bugs)} |
| Bug resolution (p50) | {fmt_hours(early_resolution)} | {fmt_hours(late_resolution)} | {trend_arrow(early_resolution, late_resolution)} |
| AI commit rate | {fmt_pct(early_ai)} | {fmt_pct(late_ai)} | {trend_arrow(early_ai, late_ai)} |

---

## Charts

### Release Speed

![PR Cycle Time](charts/pr_cycle_time.png)

![PR Throughput](charts/pr_throughput.png)

![Commit Velocity](charts/commit_velocity.png)

![PR Size Trends](charts/pr_size_trends.png)

### Bugs

![Bug Volume](charts/bug_volume.png)

![Bug Severity Distribution](charts/bug_severity.png)

![Bug Resolution Time](charts/bug_resolution_time.png)

### AI Adoption

![AI Adoption Rate](charts/ai_adoption_rate.png)

![AI vs Non-AI Cycle Time](charts/ai_vs_non_ai_cycle_time.png)

### Correlation

![Correlation Overlay](charts/correlation_overlay.png)

---

## Methodology

- **Commit data:** Extracted from local git log (`git log --since=2024-10-01`)
- **PR data:** Fetched via GitHub Search API, filtered to merged PRs
- **Bug data:** GitHub issues with the `bug` label
- **AI signal detection:**
  - Commit-level: `Co-authored-by` trailers matching known AI tools (Copilot, Claude, etc.)
  - PR-level: Keywords in PR title/body (copilot, claude, ai-generated, etc.)
- **Bot filtering:** Commits from known bots (kibanamachine, renovate-bot, elasticmachine) excluded from human metrics

## Limitations

- AI adoption proxy signals are incomplete — many developers use AI tools without leaving co-author tags or keywords
- Correlation does not imply causation — many factors affect release speed and bug rates
- Bug severity analysis depends on label consistency, which varies across teams
- PR cycle time includes review wait time, which is a human process largely independent of AI
- The `bug` label may not capture all bugs (some may use team-specific labels)
- **Bug-to-total ratio** deferred to Phase C — requires fetching all issues (not just bugs) to compute the denominator
- **Bug reopen rate** deferred to Phase C — requires per-issue timeline events API calls, which is expensive at scale

## Next Steps

See [NEXT_STEPS.md](../NEXT_STEPS.md) for Phase C (Elasticsearch/Kibana pipeline) and other improvements.
"""

    with open(OUTPUT_FILE, "w") as f:
        f.write(report)

    print(f"Summary report written to {OUTPUT_FILE}")


if __name__ == "__main__":
    generate()
```

- [ ] **Step 2: Run the script and verify output**

```bash
cd docs/superpowers/kibana-ai-study && source .venv/bin/activate && python generate_summary.py
```

Expected: Creates `output/summary.md`. Verify:

```bash
head -30 output/summary.md
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/kibana-ai-study/generate_summary.py
git commit -m "feat(ai-study): add summary report generator"
```

---

### Task 9: End-to-End Run and Verification

**Files:** None (verification only)

- [ ] **Step 1: Delete all cached data to test full pipeline**

```bash
cd docs/superpowers/kibana-ai-study && rm -rf data/ output/
```

- [ ] **Step 2: Run the full pipeline in sequence**

```bash
cd docs/superpowers/kibana-ai-study && source .venv/bin/activate
python collect_git_data.py
python collect_github_prs.py
python collect_github_issues.py
python join_data.py
python analyze.py
python visualize.py
python generate_summary.py
```

Expected: Each script prints its summary. No errors. Final output:
- `data/commits.csv` — ~22K rows
- `data/prs.json` — thousands of PRs
- `data/issues.json` — hundreds of bug issues
- `data/joined.csv` — ~22K rows enriched with PR data
- `data/issues_enriched.csv` — bug issues with resolution times
- `data/metrics.json` — monthly aggregated metrics
- `output/charts/` — 10 PNG files
- `output/summary.md` — full report

- [ ] **Step 3: Verify chart files exist and are non-empty**

```bash
ls -la output/charts/*.png | wc -l   # should be 10
find output/charts -name "*.png" -empty  # should return nothing
```

- [ ] **Step 4: Review summary report**

```bash
cat output/summary.md
```

Verify that all tables have data, chart references point to existing files, and the trends section shows reasonable numbers.

- [ ] **Step 5: Final commit with all scripts**

```bash
git add docs/superpowers/kibana-ai-study/
git commit -m "feat(ai-study): complete kibana AI adoption impact study pipeline"
```
