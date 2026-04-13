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
