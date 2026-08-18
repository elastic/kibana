# Workflow ETL cookbook for integration packages

Copy-paste recipes for common ETL patterns using Kibana workflows.

## Checkpoint pattern

Resume large ingests without re-processing:

```yaml
steps:
  - id: load-checkpoint
    elasticsearch.search:
      index: .etl-checkpoints
      query: { match: { job_id: "${job_id}" } }
  
  - id: fetch-page
    connector.github.runQueryTemplate:
      template: listIssues
      variables:
        cursor: "${load-checkpoint.cursor}"
        per_page: 100
  
  - id: save-checkpoint
    elasticsearch.index:
      index: .etl-checkpoints
      id: "${job_id}"
      document:
        cursor: "${fetch-page.endCursor}"
        updated_at: "now"
```

## Pagination with rate-limit aware retry

```yaml
steps:
  - id: fetch-with-retry
    retry:
      max_attempts: 3
      backoff: exponential
      retry_on: [429, 503]
    connector.slack.getChannelHistory:
      channel: "${channel_id}"
      cursor: "${cursor}"
      limit: 200
```

## Bulk index with stable IDs

```yaml
steps:
  - id: bulk-index
    elasticsearch.bulk:
      operations:
        - index:
            _index: my-data
            _id: "${item.id}"
          doc: "${item}"
      foreach: "${fetch-page.items}"
```

## Cross-index enrichment

```yaml
steps:
  - id: enrich
    elasticsearch.esql.query:
      query: |
        FROM enriched-data
        | WHERE lookup_id IN [${fetch-page.ids}]
        | JOIN enrich-table ON lookup_id
```

## ai.agent persistence

```yaml
steps:
  - id: classify
    ai.agent:
      agent_id: "${REPLACE_WITH_FLEET_AGENT_classifier}"
      input: "${fetch-page.items}"
```
