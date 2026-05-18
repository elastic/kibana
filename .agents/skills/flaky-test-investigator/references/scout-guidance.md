## Scout test failure guidance

When investigating a Scout failure, weight these checks higher:

- **Lane pollution.** Scout tests in the same Playwright lane share servers (see "How tests are distributed across servers"). Look at which other configs ran in the same lane in the failing build. If the same neighbor configs appear repeatedly in failing builds, suspect cross-test state leakage.
- **Worker load on shared servers (parallel configs).** Scout configs that opt in to parallelism (typically named `parallel.playwright.config.ts` and passing `workers > 1`) run multiple Playwright workers against the same Kibana/Elasticsearch test servers. Under load, this can manifest as slow responses, occasional timeouts, or transient errors that look test-specific but are really resource pressure. Worth keeping in mind when interpreting timeout-shaped failures in a parallel config — it is _not_ by itself a reason to drop `workers` back to 1. Consider it especially when the same test passes in isolation but flakes only in the full parallel run.
- **Page-object brittleness.** Page-object rewrites are a common "fix" that often does not hold. If a page-object change is on the table, confirm it addresses a root cause (e.g. the previous locator was racing with rendering) rather than being a cleaner-looking rewrite of the same race.
- **Poll/timeout values.** Bumping a Scout poll timeout is a frequent and frequently-recurring fix. Before recommending one, confirm the slow operation is intrinsic to the product (e.g. index creation, SLO calculation) rather than a missing `waitForResponse` or `waitForSelector` somewhere upstream.
- **Whole-suite recurrence.** Some Scout suites (e.g. parts of the Streams plugin, Observability dashboards) generate clusters of `failed-test` issues that share infrastructure problems. If multiple sibling specs in the same suite are flaky, expect a structural conclusion rather than a single-test patch.

## Failure artifacts (Scout)

Scout uses a custom Playwright reporter (`@kbn/scout-reporting`) that produces a self-contained HTML report per failure with the screenshot embedded. Artifacts live under `.scout/` in the Buildkite job. The standard Playwright outputs (`playwright-report/index.html`, `trace.zip`, video) are NOT what Scout publishes — don't look for them.

Scout publishes four artifact kinds per failed run, in two different roots: **reports + NDJSON at the repo root**; **PNGs at per-plugin paths**.

### Reports (always at the repo root)

- **Per-run failure index**: `.scout/reports/scout-playwright-test-failures-<runId>/test-failures-summary.json`. Array of `{ name, htmlReportFilename }`, one entry per failure in the run. Example real entry: `{ "name": "local-serverless-observability_complete - Workflow editor: validation performance - [...] setModelMarkers cascade completes within frame budget after edit", "htmlReportFilename": "3ff6decf4c25127-b92795356361dc9.html" }`. **Start here** to map a failing test name to its HTML report file.
- **Per-failure HTML report**: `.scout/reports/scout-playwright-test-failures-<runId>/<testId>.html` (e.g. `3ff6decf4c25127-b92795356361dc9.html`). One self-contained HTML file per failed test. The failure screenshot is embedded inline (base64) along with test details (suite, title, target, duration, kibana module, code owners), the command that was run, the full error stack trace, captured stdout, and a "tracked branches" status section. **For most investigations this single file is sufficient — you do not need to download the separate PNG.**
- **Structured failure NDJSON**: `.scout/reports/scout-playwright-test-failures-<runId>/scout-failures-<runId>.ndjson`. One JSON record per failure with fields `id` (matches `<testId>` in the HTML filename), `owner` (CODEOWNERS teams), `target` (Scout target tag, e.g. `local-serverless-observability_complete`), `command` (exact `npx playwright test ...` invocation), `kibanaModule` (`id` / `type` / `visibility` / `group`), `location` (test spec file path), `suite`, `title`, and `error.message` / `error.stack_trace`. **This is the artifact to use for programmatic / automated investigation** — it has everything the HTML report has, in structured form, and no base64 noise.

### Screenshot PNGs (at per-plugin paths, NOT at the repo root)

- Path: `**/.scout/test-artifacts/<test-slug-with-target>/test-failed-<N>.png`. The leading `**/` is required because `.scout/test-artifacts/` is created relative to the Playwright process working directory; per-plugin Scout configs end up writing it inside their own test root.
- Real examples observed in production builds:
  - `src/platform/plugins/shared/workflows_management/test/scout_workflows_ui/ui/.scout/test-artifacts/workflow_editor_perf-Workf-d9a7e-hin-frame-budget-after-edit-local/test-failed-1.png`
  - `x-pack/solutions/security/plugins/security_solution/test/scout/ui/.scout/test-artifacts/entity_analytics-privilege-55361-hout-risk-engine-privileges-local/test-failed-1.png`
  - `x-pack/platform/plugins/shared/streams_app/test/scout/ui/.scout/test-artifacts/query_streams-delete_query-9d9be-ng-an-existing-query-stream-local/test-failed-1.png`
- Filename anatomy:
  - `<test-slug-with-target>` is Playwright's default per-test output directory: `<spec-basename>-<title-prefix>-<short-hash>-<title-suffix>-<target>`. It is **not** the `<testId>` from the HTML report — they use different naming schemes.
  - `test-failed-<N>.png` is Playwright's default screenshot-on-failure filename. `N` is 1 for the first failing attempt, 2 for the first retry, etc., so a flaky test with retries will produce multiple PNGs.

### Server logs

`kibana.log`, `elasticsearch.log`, etc., when the failing config uploads them.

### Correlation between artifacts

- `<testId>` (e.g. `3ff6decf4c25127-b92795356361dc9`) appears in **both** the HTML report filename and the NDJSON record's `id` field — use it to pair them.
- The PNG path does **not** contain `<testId>`. To match a PNG back to its HTML report or NDJSON record, correlate via the test spec path: the NDJSON's `location` field is the full spec file path, and the PNG slug starts with the spec basename and the truncated test title.
- In practice, **prefer the HTML report's embedded screenshot** over the separate PNG. The PNG is most useful when you want screenshots from each retry attempt (`test-failed-1.png`, `test-failed-2.png`, ...).

### How to retrieve them

- **From the Buildkite job page**: open the "Artifacts" tab. Easiest path is to download the whole `.scout/reports/scout-playwright-test-failures-<runId>/` folder — that gives you summary + HTMLs + NDJSON for the run.
- **From the API / `bk artifact download <build> <glob> .`**:
  - `".scout/reports/scout-playwright-test-failures-*/test-failures-summary.json"` — index first; pick your test's `htmlReportFilename`.
  - `".scout/reports/scout-playwright-test-failures-*/<testId>.html"` — specific HTML report for one failure.
  - `".scout/reports/scout-playwright-test-failures-*/scout-failures-*.ndjson"` — all structured failure records for the run.
  - `"**/.scout/test-artifacts/**/test-failed-*.png"` — every Scout screenshot in the build (the `**/` prefix is required to discover the nested per-plugin paths).

Scout-specific patterns the HTML report screenshot reveals:

- **The locator was queried before the matching element rendered** → missing `waitForResponse` / `waitForSelector` upstream, NOT a reason to add a longer timeout to the locator itself.
- **The page navigated mid-action** → race between an in-flight network response and the next test step; usually the test should wait for the response, not for the locator.
- **A neighbor test left state in the shared server** (visible as unexpected pre-existing data in the screenshot) → lane pollution, see "Lane pollution" above.
- **The screenshot shows what you expect but the assertion still failed** → assertion is testing a different attribute than the visible one (e.g. `data-test-subj` is correct but `aria-label` was the locator).
