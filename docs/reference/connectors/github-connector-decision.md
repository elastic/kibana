# GitHub action-connector vs content-connector decision guide

## Two GitHub connector models

| Model | Type | Location | Use case |
|-------|------|----------|----------|
| **Workflow GraphQL ingest** | Action connector | `kbn-connector-specs/src/specs/github/` | Real-time, filtered, ETL via workflows |
| **ES content connector** | Content connector | `elasticsearch-connectors/github` | Full repo crawl, periodic sync, managed pipeline |

## When to use workflow GraphQL ingest

- You need **filtered** data (specific repos, labels, date ranges)
- You want **real-time** or **on-demand** ingestion
- Data is consumed by **agents** or **workflows** in Kibana
- You need **cross-source** joins (GitHub + Slack + Jira in one workflow)
- You're building a Fleet **integration package** with ETL workflows

## When to use the ES content connector

- You need **full** repository crawl (all issues, PRs, comments)
- You want **periodic** sync without workflow orchestration
- Data is consumed via **Elasticsearch queries** directly
- You're using the **Elastic connector framework** (not Fleet)

## Dual-pipeline pattern

Some integrations benefit from both:

1. **Content connector** for bulk historical backfill
2. **Workflow GraphQL** for incremental real-time updates

```
Content connector → bulk index (historical)
Workflow GraphQL  → incremental index (real-time, filtered)
```

This avoids re-crawling the entire repository for each incremental update.

## Decision matrix

| Requirement | Workflow GraphQL | Content connector |
|------------|-----------------|-------------------|
| Filtered data | ✅ | ❌ |
| Real-time | ✅ | ❌ |
| Full crawl | ❌ | ✅ |
| Cross-source joins | ✅ | ❌ |
| Fleet package | ✅ | ❌ |
| Agent Builder | ✅ | ❌ |
| Managed pipeline | ❌ | ✅ |
