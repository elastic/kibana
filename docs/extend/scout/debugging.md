---
navigation_title: Debugging
---

# Debug Scout test runs [scout-debugging]

This page lists the fastest ways to debug Scout tests locally and in CI.

## Local runs [scout-debugging-local]

- If your tests use the `log` fixture, messages are printed in local console output.
- For more verbose output, set `SCOUT_LOG_LEVEL=debug`.

### Open the HTML report [open-the-scout-report]

After a run, Playwright generates an HTML report. The console output includes the report path. To open the latest report:

```bash
npx playwright show-report <plugin-path>/test/scout/ui/output/reports
```

::::::{note}
**CI runs**: in Buildkite, the Playwright HTML report is typically available under the job’s **Artifacts**.
::::::

### Playwright UI mode [playwright-ui-mode]

[UI Mode](https://playwright.dev/docs/test-ui-mode) lets you run and debug tests interactively.

```bash
npx playwright test \
  --config <plugin-path>/test/scout/ui/playwright.config.ts \
  --project local \
  --ui \
  --grep @<location>-<arch>-<domain>
```

The `--grep` value should match the suite tags you use. See [Deployment tags](./deployment-tags.md).

## Debug flaky tests [scout-debugging-flaky-tests]

When you add new tests, fix flakes, or make significant changes, run the same tests multiple times (recommended: **20–50** runs). See [Best practices](./best-practices.md#use-the-flaky-test-runner-to-catch-flaky-tests-early).

### Repeat the same test locally [scout-debugging-flaky-tests-local]

To reproduce flakiness locally, you can run the same test multiple times with Playwright’s `--repeat-each`.

**Grepping is key**: always pass `--grep` with the test title or tag that matches the target environment you’re running against, otherwise you may run suites that aren’t compatible with your chosen `--project`.

Example (repeat a single spec 30 times):

```bash
npx playwright test dashboard_search_by_value.spec.ts \
  --project mki \
  --grep @cloud-serverless-search \
  --config src/platform/plugins/shared/dashboard/test/scout/ui/parallel.playwright.config.ts \
  --repeat-each 30
```

`--project mki` runs against **cloud serverless**, so you’ll typically want a `@cloud-serverless-<domain>` grep (for example `@cloud-serverless-search`). For local runs (`--project local`), use `@local-...` tags.

If you’re unsure what to use for `--grep`, check the tags on the `test.describe(...)` block (see [Deployment tags](./deployment-tags.md)).

### Run the Flaky Test Runner (CI) [scout-debugging-flaky-tests-ci]

There are two common ways to trigger the Flaky Test Runner (Elasticians only):

- **UI**: open `https://ci-stats.kibana.dev/trigger_flaky_test_runner` and follow the prompts.
- **GitHub PR comment**: post a comment on your pull request:

```bash
/flaky scoutConfig:<Playwright config path>:<number of runs>
```

Example:

```bash
/flaky scoutConfig:src/platform/plugins/shared/dashboard/test/scout/ui/parallel.playwright.config.ts:30
```
