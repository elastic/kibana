## Scout test failure guidance

When investigating a Scout failure, weight these checks higher:

- **Lane pollution.** Scout tests in the same Playwright lane share servers (see "How tests are distributed across servers"). Look at which other configs ran in the same lane in the failing build. If the same neighbor configs appear repeatedly in failing builds, suspect cross-test state leakage.
- **Worker load on shared servers (parallel configs).** Scout configs that opt in to parallelism (typically named `parallel.playwright.config.ts` and passing `workers > 1`) run multiple Playwright workers against the same Kibana/Elasticsearch test servers. Under load, this can manifest as slow responses, occasional timeouts, or transient errors that look test-specific but are really resource pressure. Worth keeping in mind when interpreting timeout-shaped failures in a parallel config — it is _not_ by itself a reason to drop `workers` back to 1. Consider it especially when the same test passes in isolation but flakes only in the full parallel run.
- **Page-object brittleness.** Page-object rewrites are a common "fix" that often does not hold. If a page-object change is on the table, confirm it addresses a root cause (e.g. the previous locator was racing with rendering) rather than being a cleaner-looking rewrite of the same race.
- **Poll/timeout values.** Bumping a Scout poll timeout is a frequent and frequently-recurring fix. Before recommending one, confirm the slow operation is intrinsic to the product (e.g. index creation, SLO calculation) rather than a missing `waitForResponse` or `waitForSelector` somewhere upstream.
- **Whole-suite recurrence.** Some Scout suites (e.g. parts of the Streams plugin, Observability dashboards) generate clusters of `failed-test` issues that share infrastructure problems. If multiple sibling specs in the same suite are flaky, expect a structural conclusion rather than a single-test patch.

## Failure artifacts (Scout)

Scout uses a custom Playwright reporter (`@kbn/scout-reporting`) that produces self-contained HTML reports per failure with the screenshot embedded. The standard Playwright outputs (`playwright-report/index.html`, `trace.zip`, video) are NOT what Scout publishes.

### What to download

| Artifact | Path | What's in it |
| --- | --- | --- |
| Per-run index | `.scout/reports/scout-playwright-test-failures-<runId>/test-failures-summary.json` | Array of `{ name, htmlReportFilename }`. **Start here** to map a failing test name to its HTML report. |
| Per-failure HTML | `.scout/reports/scout-playwright-test-failures-<runId>/<testId>.html` | Self-contained: test details, command, error stack, stdout, **embedded screenshot** (base64). For most investigations this is enough. |
| Structured NDJSON | `.scout/reports/scout-playwright-test-failures-<runId>/scout-failures-<runId>.ndjson` | One JSON record per failure: `id` (= `<testId>`), `owner`, `target`, `command`, `kibanaModule`, `location`, `suite`, `title`, `error.message` / `error.stack_trace`. **Use this for programmatic investigation.** |
| Separate PNG | `**/.scout/test-artifacts/<test-slug-with-target>/test-failed-<N>.png` | Playwright's default per-test screenshot. Nested under per-plugin test roots (the `**/` prefix is required). `<N>` is the attempt number — retries produce multiple PNGs. |

`<testId>` (e.g. `3ff6decf4c25127-b92795356361dc9`) appears in **both** the HTML filename and the NDJSON `id`. The PNG does NOT contain `<testId>`; correlate via the spec file path (NDJSON's `location` matches the PNG's spec-basename prefix).

### How to retrieve

```sh
bk artifact download <build> ".scout/reports/scout-playwright-test-failures-*/test-failures-summary.json" .
bk artifact download <build> ".scout/reports/scout-playwright-test-failures-*/<testId>.html" .
bk artifact download <build> ".scout/reports/scout-playwright-test-failures-*/scout-failures-*.ndjson" .
bk artifact download <build> "**/.scout/test-artifacts/**/test-failed-*.png" .
```

### Common patterns the screenshot reveals

- **Locator queried before the matching element rendered** → missing `waitForResponse` / `waitForSelector` upstream.
- **Page navigated mid-action** → race between in-flight response and next test step.
- **Neighbor test left state in the shared server** (unexpected pre-existing data) → lane pollution.
- **Screenshot shows what you expect but assertion failed** → assertion is testing a different attribute than the visible one.
