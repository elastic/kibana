# Kibana AI Adoption Impact Study — Design Spec

**Date:** 2026-04-13
**Scope:** Exploratory analysis of `elastic/kibana` GitHub data
**Timeframe:** Last 18 months (Oct 2024 – Apr 2026)

## Goal

Analyze how AI tool adoption has correlated with code release speed and bug patterns in the `elastic/kibana` repository. Produce exploratory scripts that generate charts and a written summary of findings.

## Approach

**Hybrid: Git Log + GitHub API (Approach 3)**

- Use the local git clone for commit data (fast, no rate limits, co-author tags available natively)
- Use the GitHub API (via `gh` CLI) for PR and issue metadata
- Cache all API responses to avoid rate limit issues on re-runs
- Join datasets locally to link commits → PRs → issues

## Data Collection

### Git Log Extraction (local)

Extract all commits from the last 18 months with:
- Hash, author, date, commit message
- Files changed, insertions, deletions
- `Co-Authored-By` trailers (parsed to detect AI co-authors: Claude, Copilot, etc.)

Output: `data/commits.csv`

### GitHub API Extraction (cached)

**Pull Requests** — all merged PRs in the timeframe:
- Number, title, body, author, created date, merged date
- Review count, labels, linked issues

**Issues** — issues labeled as `bug` (or similar bug-related labels):
- Number, title, created date, closed date
- Labels, linked PRs, milestone

**AI signal scanning:**
- Scan PR titles/bodies for AI-related keywords: "copilot", "claude", "ai-generated", "AI", "LLM", etc.

Output: `data/prs.json`, `data/issues.json`

### Data Joining

- Match commits to PRs via merge commit references or GitHub's commit-to-PR mapping
- Link bug issues to fix PRs via GitHub cross-reference data

Output: `data/joined.csv`

## Metrics

### Release Speed

| Metric | Description | Granularity |
|--------|-------------|-------------|
| PR cycle time | Time from PR creation to merge | Weekly/monthly, p50/p75/p95 |
| PR throughput | Number of merged PRs | Per week/month |
| Commit velocity | Total commits and per-author average | Per week/month |
| PR size trends | Lines changed per PR | Monthly averages |

### Bugs

| Metric | Description | Granularity |
|--------|-------------|-------------|
| Bug volume | New bug issues opened | Per week/month |
| Bug resolution time | Creation to close duration | p50/p75/p95 |
| Bug-to-total ratio | Bug issues / all issues | Monthly percentage |
| Bug reopen rate | Bugs reopened within 30 days of close | Monthly percentage |
| Bug severity distribution | Mix of severity labels over time | Monthly breakdown |

### AI Signal Overlay

| Metric | Description |
|--------|-------------|
| AI-assisted commit rate | % of commits with AI co-author tags per month |
| AI-mentioned PRs | % of PRs with AI keywords in title/body per month |
| AI vs non-AI PR comparison | Cycle time, size, linked bugs — split by AI signal |
| Correlation plots | AI adoption rate overlaid on speed/bug metrics |

## Project Structure

```
docs/superpowers/kibana-ai-study/
├── collect_git_data.py       # Git log extraction → CSV
├── collect_github_data.py    # GitHub API extraction → cached JSON
├── join_data.py              # Link commits ↔ PRs ↔ issues
├── analyze.py                # Compute all metrics
├── visualize.py              # Generate charts
├── data/                     # Cached raw data (gitignored)
│   ├── commits.csv
│   ├── prs.json
│   ├── issues.json
│   └── joined.csv
└── output/                   # Generated charts and summary
    ├── charts/
    └── summary.md            # Key findings in Markdown
```

## Tech Stack

- **Python 3** with `pandas` for data wrangling
- **matplotlib + seaborn** for static charts
- **`gh` CLI** for GitHub API calls (already authenticated)
- **Shell/git** for commit log extraction

## Constraints

- All scripts are idempotent — re-runs skip already-cached data
- No external services or databases required
- Each script runs independently after data collection
- API responses cached to JSON to respect rate limits

## Future Improvements (Phase C and beyond)

Documented in `NEXT_STEPS.md` within the project directory:

- **Elasticsearch/Kibana pipeline:** Ingest joined dataset into Elasticsearch, build interactive Kibana dashboards with filters by author, time range, label, AI signal. Enable ongoing ingestion via scheduled runs.
- **Richer AI signal detection:** Analyze commit message patterns, diff sizes, and code style markers beyond co-author tags and keywords.
- **Deeper bug impact analysis:** Link bugs to specific files/areas to compare bug density in AI-heavy vs. non-AI areas.
- **Per-team/area breakdown:** Segment metrics by codebase area (platform, solutions, packages) to see if AI adoption varies across teams.
- **Automated refresh:** Cron-based script to pull new data weekly and regenerate charts.
