---
navigation_title: Debugging
---

# Debug Scout test runs [scout-debugging]

This page lists the fastest ways to debug Scout tests locally and in CI.

## Local runs [scout-debugging-local]

- If your tests use the `log` fixture, messages are printed in local console output.
- For more verbose output, set `SCOUT_LOG_LEVEL=debug`.

## Open the HTML report [open-the-scout-report]

After a run, Playwright generates an HTML report. The console output includes the report path. To open the latest report:

```bash
npx playwright show-report <plugin-path>/test/scout/ui/output/reports
```

## Playwright UI mode [playwright-ui-mode]

[UI Mode](https://playwright.dev/docs/test-ui-mode) lets you run and debug tests interactively.

```bash
npx playwright test \
  --config <plugin-path>/test/scout/ui/playwright.config.ts \
  --project local \
  --ui \
  --grep @<location>-<arch>-<domain>
```

The `--grep` value should match the suite tags you use. See [Deployment tags](./deployment-tags.md).

## CI runs [scout-debugging-ci]

In Buildkite, the Playwright HTML report is typically available under the job’s **Artifacts**.
