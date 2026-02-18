---
navigation_title: Reporting
---

# Scout reporting [scout-reporting]

At the end of a test run, Scout generates HTML reports: both a summary and a detailed failure report for each individual failure. See [Debugging](./debugging.md#open-the-scout-report).

In CI, Scout can also capture test event data from Playwright, Jest, and FTR (Mocha-based) test runners.

:::::{note}
Some reporting destinations and dashboards are internal-only (Elasticians). Where applicable, Scout documentation will call that out and point to internal AppEx QA documentation.
:::::

## Historical test results data (internal) [scout-reporting-historical]

Internal (Elasticians): events can be explored in the “Scout” Kibana space in the AppEx QA team’s cluster.

Example questions the data can help answer:

- How many times has this test failed in the past month?
- Are failures isolated to a specific environment (for example, MKI)?
- Do multiple failures share a common root cause or error message?
- Is there a spike in flakiness or newly introduced instability?

## AppEx QA dashboards (internal) [scout-reporting-dashboards]

Internal (Elasticians): AppEx QA maintains dashboards for skipped tests, flaky runs, performance, and inventory. Most dashboards include a control like `test.file.owner` to filter by team.

## Receive weekly QA insights (internal) [scout-reporting-weekly]

Internal (Elasticians): you can request a weekly QA report with insights on skipped tests, flakiness trends, and other key metrics for your team via the AppEx QA team.

## Try the Scout Reporter locally (internal) [scout-reporter-local]

When running tests locally, the event-based reporter is disabled by default. To enable it:

```bash
export SCOUT_REPORTER_ENABLED=true
```

Once enabled, Scout outputs event logs as NDJSON files in `.scout/reports` (relative to the Kibana repo root). These events follow the Elastic Common Schema (ECS) and are ready for ingestion into Elasticsearch.

Internal (Elasticians): use the Scout CLI (`node scripts/scout.js`) to:

- `initialize-report-datastream`: create a data stream and required components
- `upload-events`: upload events produced by the Scout reporter to an Elasticsearch instance (configured via `SCOUT_REPORTER_ES_URL` and `SCOUT_REPORTER_ES_API_KEY`)

