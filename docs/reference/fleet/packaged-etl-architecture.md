# Packaged multi-source ETL on Kibana

This reference architecture describes how Kibana packages multi-source
extract-transform-load (ETL) pipelines using Fleet, Connectors v2, Workflows,
Agent Builder, and Elasticsearch.

## Architecture overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Fleet Package                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ Manifest │  │ Workflow │  │ ES|QL    │  │ Alerting │            │
│  │ (vars)   │  │ Assets   │  │ Views    │  │ Templates│            │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘            │
│       │              │              │              │                  │
│  ┌────┴──────────────┴──────────────┴──────────────┴─────┐         │
│  │  Install State Machine (Fleet)                         │         │
│  └────────────────────────┬──────────────────────────────┘         │
└───────────────────────────┼─────────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
     ┌──────────────┐ ┌──────────┐ ┌──────────────┐
     │ Connectors   │ │ Workflows│ │ Elasticsearch │
     │ v2 (ingest)  │ │ (ETL)    │ │ (indices +    │
     │              │ │          │ │  ES|QL views) │
     └──────┬───────┘ └────┬─────┘ └──────┬───────┘
            │              │              │
            └──────────────┤──────────────┘
                           │
                    ┌──────┴───────┐
                    │ Agent Builder│
                    │ (analysis)   │
                    └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    │  Dashboards  │
                    └──────────────┘
```

## Components

### Fleet package

A Fleet package bundles all assets needed for an integration:

- **Manifest** — declares variables, asset types, and install behavior.
  Includes opt-in flags like `create_alerting_rules: true` and
  `workflows.default_enabled`.
- **Workflow assets** — YAML workflow definitions installed via
  `step_install_workflow_assets`. Dependencies between workflows are
  respected (dependency-ordered install).
- **ES|QL view assets** — Curated views installed via
  `step_install_esql_views`, providing reusable query surfaces.
- **Alerting rule templates** — JSON templates materialized as disabled
  rules when `create_alerting_rules: true` is set.
- **Index templates** — ES index templates for data streams.

### Connectors v2 (ingest plane)

Connectors provide the source-specific ingest logic. Each connector
fetches data from an external system (GitHub, Slack, Google Drive, etc.)
and writes raw documents to an Elasticsearch index.

### Workflows (scheduled ETL)

Workflows define the scheduled ETL pipeline using stock steps:

- `elasticsearch.index` — Single-document upsert by `_id` (idempotent).
- `elasticsearch.bulk` — Batch upsert with `id_field` for deduplication.
- `elasticsearch.esql.query` — Read-only ES|QL query.
- `elasticsearch.esql.materialize` — Query a view and persist results
  to a snapshot index.
- `data.loadCheckpoint` — Load checkpoint state for incremental syncs.
- `ai.agent` — Run an LLM agent for analysis or enrichment.
- `foreach` — Iterate over a dataset and run sub-steps per item.
- `workflow.execute` — Call a sub-workflow.

Workflows are installed disabled or enabled based on the manifest flag
`workflows.default_enabled`. Schedules are defined in the workflow YAML.

### Elasticsearch (indices + views)

- **Raw indices** — Populated by connectors.
- **Enriched indices** — Populated by workflow ETL steps.
- **Snapshot indices** — Populated by `elasticsearch.esql.materialize`
  for trend analysis.
- **ES|QL views** — Curated queries that provide a stable query surface
  for dashboards and agents.

### Agent Builder (analysis)

Agent Builder agents consume enriched indices and ES|QL views to
provide natural-language analysis. Agents can:

- Query ES|QL views for current state.
- Run read-only tools against Elasticsearch.
- Produce structured output validated against declared schemas.

### Dashboards

Dashboards visualize the enriched and snapshot indices. They reference
ES|QL views for consistent query patterns across visualizations.

## Install lifecycle

1. **Install** — Fleet installs all package assets in dependency order.
   Workflows are created (disabled by default). Alerting rules are
   materialized (disabled, action-less).

2. **Configure** — Admin wires connectors, enables workflows, attaches
   alerting actions, and enables rules.

3. **Run** — Workflows execute on schedule, ingesting and transforming
   data. Agents analyze the results. Dashboards render in real time.

4. **Upgrade** — Fleet re-runs install steps. Same-ID assets are updated
   in place (no duplicates). Removed assets are orphaned (not deleted
   automatically — admin must clean up).

5. **Uninstall** — Fleet removes all package-managed assets.

## Appendix: SDLC Visibility Platform example

The SDLC Visibility Platform is an example integration built on this
architecture:

- **Sources**: GitHub (catalog, PRs, issues), Slack, Google Drive.
- **Connectors**: GitHub connector, Slack connector.
- **Workflows**: Catalog ingestion, PR enrichment, stale-epic detection.
- **Indices**: `sdlc-epic-phases`, `sdlc-project-items-enriched`.
- **Views**: `sdlc-epic-phases-view`, `sdlc-project-items-enriched-view`.
- **Agents**: SDLC analysis agent for development intelligence queries.
- **Dashboards**: Epic phase distribution, PR throughput, reviewer load.
- **Alerting**: Stale epic detection, missing PRD, bottleneck reviewer.

## See also

- [Integration alerting templates](integration-alerting-templates.md)
- [Alerting settings](../configuration-reference/alerting-settings.md)
- [Fleet settings](../configuration-reference/fleet-settings.md)
