## Scout test failure guidance

When investigating a Scout failure, weight these checks higher:

- **Lane pollution.** Scout tests in the same Playwright lane share servers (see "How tests are distributed across servers"). Look at which other configs ran in the same lane in the failing build. If the same neighbor configs appear repeatedly in failing builds, suspect cross-test state leakage.
- **Worker load on shared servers (parallel configs).** Scout configs that opt in to parallelism (typically named `parallel.playwright.config.ts` and passing `workers > 1`) run multiple Playwright workers against the same Kibana/Elasticsearch test servers. Under load, this can manifest as slow responses, occasional timeouts, or transient errors that look test-specific but are really resource pressure. Worth keeping in mind when interpreting timeout-shaped failures in a parallel config — it is _not_ by itself a reason to drop `workers` back to 1. Consider it especially when the same test passes in isolation but flakes only in the full parallel run.
- **Page-object brittleness.** Page-object rewrites are a common "fix" that often does not hold. If a page-object change is on the table, confirm it addresses a root cause (e.g. the previous locator was racing with rendering) rather than being a cleaner-looking rewrite of the same race.
- **Poll/timeout values.** Bumping a Scout poll timeout is a frequent and frequently-recurring fix. Before recommending one, confirm the slow operation is intrinsic to the product (e.g. index creation, SLO calculation) rather than a missing `waitForResponse` or `waitForSelector` somewhere upstream.
- **Whole-suite recurrence.** Some Scout suites (e.g. parts of the Streams plugin, Observability dashboards) generate clusters of `failed-test` issues that share infrastructure problems. If multiple sibling specs in the same suite are flaky, expect a structural conclusion rather than a single-test patch.

## Failure artifacts (Scout)

Scout uses a custom Playwright reporter (`@kbn/scout-reporting`) that produces a self-contained HTML report per failure with the screenshot embedded. Artifacts live under `.scout/` in the Buildkite job. The standard Playwright outputs (`playwright-report/index.html`, `trace.zip`, video) are NOT what Scout publishes — don't look for them.

- **Per-run failure index**: `.scout/reports/scout-playwright-test-failures-<runId>/test-failures-summary.json`. Always at the repo root. Lists every failure in the run as `{ name, htmlReportFilename }`. **Start here** — it maps each failed test to its specific HTML report file.
- **Per-failure HTML report**: `.scout/reports/scout-playwright-test-failures-<runId>/<testId>.html` (e.g. `f24ba03baeb5e26-0723e6c11fe5d87.html`). Always at the repo root, alongside the summary JSON. One self-contained HTML file per failed test. The failure screenshot is embedded inline (base64) along with: test details (suite, title, target, duration, kibana module, code owners), the command that was run, the full error stack trace, captured stdout, and a "tracked branches" status section indicating whether this failure also reproduces on a tracked branch.
- **Individual screenshot PNGs**: `**/.scout/test-artifacts/<testId>_<attachmentName>_<timestamp>.png`. **Not at a fixed path** — the `.scout/test-artifacts/` directory is created relative to the process working directory, so for per-plugin Scout configs the PNGs may be nested under paths like `x-pack/.../test/scout/.scout/test-artifacts/...`. Buildkite uploads them with `**/.scout/test-artifacts/**/*.png` so the glob discovers them at any depth. Filename pieces:
  - `<testId>` = same hash as the HTML report (a content hash of test file path + full title).
  - `<attachmentName>` = the Playwright attachment name, typically `screenshot`.
  - `<timestamp>` = ISO timestamp with `:` and `.` replaced by `-` (e.g. `2026-05-18T13-44-30-123Z`).
- **Server logs** (`kibana.log`, `elasticsearch.log`) when the failing config uploads them.

`<runId>` is a per-run hash; `<testId>` is a hash of the test file path + full test title, so the same failing test re-emits the same `<testId>` across runs. This means you can correlate a PNG to its HTML report by matching `<testId>` even though the two files live in different artifact trees.

How to retrieve them:

- From the Buildkite job page: open the "Artifacts" tab. Either download the full `.scout/reports/scout-playwright-test-failures-<runId>/` folder, or pick the single summary JSON + the one HTML + the matching PNG(s).
- From the CLI (`bk artifact download <build> <glob> .`):
  - `".scout/reports/scout-playwright-test-failures-*/test-failures-summary.json"` — grab the index first to find your test's `htmlReportFilename`.
  - `".scout/reports/scout-playwright-test-failures-*/<testId>.html"` — then the specific HTML report.
  - `"**/.scout/test-artifacts/<testId>_*.png"` — all PNGs for that one failing test (note the `**/` prefix; without it the glob may not match nested paths).
  - `"**/.scout/test-artifacts/**/*.png"` — every Scout screenshot in the build (use when you don't yet have a `<testId>`).

Scout-specific patterns the HTML report screenshot reveals:

- **The locator was queried before the matching element rendered** → missing `waitForResponse` / `waitForSelector` upstream, NOT a reason to add a longer timeout to the locator itself.
- **The page navigated mid-action** → race between an in-flight network response and the next test step; usually the test should wait for the response, not for the locator.
- **A neighbor test left state in the shared server** (visible as unexpected pre-existing data in the screenshot) → lane pollution, see "Lane pollution" above.
- **The screenshot shows what you expect but the assertion still failed** → assertion is testing a different attribute than the visible one (e.g. `data-test-subj` is correct but `aria-label` was the locator).
