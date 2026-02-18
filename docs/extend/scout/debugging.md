---
navigation_title: Debugging
---

# Debug Scout test runs [scout-debugging]

Failing or flaky tests are no fun. This guide covers tools to debug Scout tests locally and in CI.

## Local test runs [scout-debugging-local]

If you use the `log` fixture in your tests, those messages appear in console output when running locally.

:::::{warning}
Enable debug logs by setting `SCOUT_LOG_LEVEL=debug`.
:::::

## Open the Scout report [open-the-scout-report]

After running tests, Playwright generates an HTML report. The console output includes the report path. You can open the last report with:

```bash
npx playwright show-report <your-plugin-path>/test/scout/ui/output/reports
```

## Playwright UI mode [playwright-ui-mode]

[UI Mode](https://playwright.dev/docs/test-ui-mode) lets you explore, run, and debug tests interactively.

Append `--ui`:

```bash
npx playwright test \
  --config <plugin-path>/test/scout/ui/playwright.config.ts \
  --project local \
  --ui \
  --grep @<location>-<arch>-<domain>
```

:::::{note}
`--grep` filters tests by tag (`@<location>-<arch>-<domain>`), for example `@local-stateful-classic`, `@cloud-serverless-search`, `@local-serverless-security_complete`.
:::::

## CI test runs [scout-debugging-ci]

In Buildkite, the Playwright HTML report is typically available under the job’s Artifacts section.

:::::{note}
The original internal Scout docs include screenshots for Buildkite artifacts and UI Mode. Those images aren’t present in this repository copy; for screenshots and internal pipeline details, see internal AppEx QA documentation.
:::::

## Historical test results data [scout-debugging-historical]

Scout reporting can help you analyze longer-term trends (flakiness, environment-specific failures, performance regressions). See [Reporting](./reporting.md).

