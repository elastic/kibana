# Metrics Experience E2E Tests

Scout UI tests for the Metrics in Discover feature.

## Data strategy

Most tests use a single dynamically created TSDB index (`test-metrics-experience`) with 45 metric fields (23 gauge + 22 counter) and 30 dimensions. The index is created once in `global.setup.ts` via `createMetricsTestIndexIfNeeded` and reused across all specs.

A companion TSDB index (`test-metrics-experience-other`) is also created in `global.setup.ts` from `DIMENSIONS_WIPE_CONFIG`. It deliberately emits a different dimension set (only the shared `dimension_0` plus a `dimension_only_in_b`), and is used by `dimensions_wipe.spec.ts` to exercise stream switches across heterogeneous dimension sets.

A matching data view is loaded from `kbn_archives/metrics_data_view.json` in each spec's `beforeAll` hook. This keeps the suite fully self-contained with no dependency on external ES archives.

## Running locally

Start a server, then run the tests:

```bash
# Stateful
node scripts/scout start-server --arch stateful --domain classic

# Serverless observability
node scripts/scout start-server --arch serverless --domain observability_complete

# Serverless security
node scripts/scout start-server --arch serverless --domain security_complete
```

```bash
npx playwright test \
  src/platform/plugins/shared/discover/test/scout/ui/parallel_tests/metrics_experience/ \
  --config src/platform/plugins/shared/discover/test/scout/ui/parallel.playwright.config.ts \
  --project local --trace on
```

To check stability before merging, trigger the flaky test runner from a PR comment:

```
/flaky scoutConfig:src/platform/plugins/shared/discover/test/scout/ui/parallel.playwright.config.ts:30
```