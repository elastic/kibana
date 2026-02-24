# Metrics Experience E2E Tests

Scout UI tests for the Metrics in Discover feature.

We follow Scout Best Practices for test structure and conventions.

## Folder structure

```
discover/test/scout/ui/
├── metrics_experience_parallel.playwright.config.ts
├── fixtures/
│   └── metrics_experience/
│       ├── index.ts                     # spaceTest extension with MetricsExperiencePage
│       ├── constants.ts                 # Queries, data view name, tags
│       ├── kbn_archives/
│       │   └── metrics_data_view.json   # Data view pointing to dynamic index
│       ├── page_objects/
│       │   └── metrics_experience.ts    # Page object for metrics UI
│       └── generators/
│           └── metrics_tsdb_index.ts    # Dynamic TSDB index creation
└── parallel_tests/
    └── metrics_experience/              # Feature subfolder (you are here)
        ├── global.setup.ts              # Creates dynamic test index
        ├── grid.spec.ts                 # Grid activation/command compatibility
        └── grid.navigation.spec.ts      # Pagination and search
```

## Data strategy

All tests use a single dynamically created TSDB index (`test-metrics-experience`) with 45 metric fields (23 gauge + 22 counter) and 30 dimensions. The index is created in `global.setup.ts` via `createMetricsTestIndexIfNeeded` and is reused across all specs.

A matching data view is loaded from `kbn_archives/metrics_data_view.json` in each spec's `beforeAll` hook, pointing Discover to the dynamic index.

This approach keeps the test suite fully self-contained with no dependency on external ES archives.

## How to add a new test

1. Decide if it fits in an existing spec or needs a new one
2. Use the page object (`MetricsExperiencePage`) for locators. Add new ones there if needed.
3. Add constants to `constants.ts`
4. If custom data is needed, extend the generator or create a new one
5. Use `spaceTest.step()` for multi-step journeys within a single test
6. Tag your test with `testData.METRICS_EXPERIENCE_TAGS` to ensure it runs in the correct environments

## Detecting flaky tests

When adding or modifying tests, run the flaky test runner to verify stability before merging. Trigger it via a PR comment:

```
/flaky scoutConfig:<scout config path>:<retry count>
```

For the metrics experience tests:

```
/flaky scoutConfig:src/platform/plugins/shared/discover/test/scout/ui/metrics_experience_parallel.playwright.config.ts:30
```

25-30 runs is considered safe to call tests "stable". See [example in PR #253076](https://github.com/elastic/kibana/pull/253076#issuecomment-3913203928) where 30/30 runs passed.

## Running tests locally

First, start a server in a separate terminal. Use stateful OR serverless depending on which environment you want to test:

```bash
# For stateful tests
node scripts/scout start-server --arch stateful --domain classic

# For serverless observability tests
node scripts/scout start-server --arch serverless --domain observability_complete
```

Then, in another terminal, run the tests:

```bash
npx playwright test \
  src/platform/plugins/shared/discover/test/scout/ui/parallel_tests/metrics_experience/ \
  --config src/platform/plugins/shared/discover/test/scout/ui/metrics_experience_parallel.playwright.config.ts \
  --project local --trace on
```
