# Scout

## Cloud failure

If the test failed outside of `kibana-on-merge`

## Investigation help

When investigating a Scout failure, weight these checks higher:

- **Lane pollution.** Scout tests in the same Playwright lane share servers (see "How tests are distributed across servers"). Look at which other configs ran in the same lane in the failing build. If the same neighbor configs appear repeatedly in failing builds, suspect cross-test state leakage.
- **Worker load on shared servers (parallel configs).** Scout configs that opt in to parallelism (typically named `parallel.playwright.config.ts` and passing `workers > 1`) run multiple Playwright workers against the same Kibana/Elasticsearch test servers. Under load, this can manifest as slow responses, occasional timeouts, or transient errors that look test-specific but are really resource pressure. Worth keeping in mind when interpreting timeout-shaped failures in a parallel config — it is _not_ by itself a reason to drop `workers` back to 1. Consider it especially when the same test passes in isolation but flakes only in the full parallel run.
- **Page-object brittleness.** Page-object rewrites are a common "fix" that often does not hold. If a page-object change is on the table, confirm it addresses a root cause (e.g. the previous locator was racing with rendering) rather than being a cleaner-looking rewrite of the same race.
- **Poll/timeout values.** Bumping a Scout poll timeout is a frequent and frequently-recurring fix. Before recommending one, confirm the slow operation is intrinsic to the product (e.g. index creation, SLO calculation) rather than a missing `waitForResponse` or `waitForSelector` somewhere upstream.
- **Whole-suite recurrence.** Some Scout suites (e.g. parts of the Streams plugin, Observability dashboards) generate clusters of `failed-test` issues that share infrastructure problems. If multiple sibling specs in the same suite are flaky, expect a structural conclusion rather than a single-test patch.

## Failure artifacts (Scout)

Scout / Playwright produces richer artifacts than FTR because the framework records the full session. Pull these in this order:

- **Playwright HTML report** (`playwright-report/index.html`, usually zipped per failure). Open locally — it gives a per-test summary, embedded screenshots at each step, the full call log of every locator query, the stack trace, and (if enabled) attached video and trace files.
- **Trace file** (`trace.zip`). Open with `npx playwright show-trace trace.zip`. Lets you scrub through every action with synchronized screenshots, DOM snapshots, network panel, and console output — the closest you can get to a debugger replay without re-running the test.
- **Video** (when the config enables it). Confirms timing-related flakes that screenshots miss.
- **Server logs** (`kibana.log`, `elasticsearch.log`) when the failing config uploads them.

How to retrieve them:

- From the Buildkite job page: scroll to the "Artifacts" section. The HTML report is usually inside a `.zip`.
- Locally: `bk artifact download <build> "playwright-report*" .` then unzip and open `index.html` in a browser.

Scout-specific patterns the trace and HTML report reveal:

- **The locator was queried before the matching element rendered** → missing `waitForResponse` / `waitForSelector` upstream, NOT a reason to add a longer timeout to the locator itself.
- **The page navigated mid-action** → race between an in-flight network response and the next test step; usually the test should wait for the response, not for the locator.
- **A neighbor test left state in the shared server** (visible as unexpected pre-existing data in the first screenshot) → lane pollution, see "Lane pollution" above.
- **The screenshot shows what you expect but the assertion still failed** → assertion is testing a different attribute than the visible one (e.g. `data-test-subj` is correct but `aria-label` was the locator).
