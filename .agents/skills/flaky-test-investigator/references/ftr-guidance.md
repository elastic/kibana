# FTR test failure guidance

When investigating an FTR failure, weight these checks higher:

- **`retry.tryForTime reached timeout` / `retry.try reached timeout` is a diagnostic signal, not a knob.** If the failure stack already shows a retry-helper timeout, the awaited state is not arriving. Investigate _what_ the retry is waiting for and why it never settles. (The pitfall rule against timeout bumps lives in the parent `SKILL.md`.)
- **What the retry wraps matters more than whether one is added.** `retry.try` / `retry.tryForTime` / `retry.waitFor` tend to hold when wrapping operations that are genuinely eventually consistent (Fleet/EPM install, EBT telemetry events, saved-object indexing propagation, task-manager pickup). They tend to recur when wrapping a page-object helper whose real problem is silent failure or a stale locator — in those cases the right fix is upstream of the retry.
- **Audit page-object helpers for silent-failure anti-patterns** when the failure manifests as `Cannot read properties of undefined` or "click on a thing that was never rendered". Two patterns repeatedly cause this:
  - `testSubjects.exists()` inside an `if` — silently skips the action when the element isn't ready, leaving the caller to operate on absent state.
  - Unguarded `testSubjects.findAll(...)[0]` — returns `[]` when nothing has rendered, crashes on the index access.
    Replace either with an explicit wait (`retry.waitFor(...)` then assert) so a missing element fails loudly instead of corrupting test state.
- **Cross-test state leakage in serverless suites.** FTR generally provisions fresh servers per config, but serverless functional suites running against shared clusters can accumulate leftover indices, transforms, rules, spaces, or saved objects across tests in the same config. When a failure depends on test ordering, look at the cleanup story (`afterAll` / `afterEach`) for the suite, not just the specific failing test.
- **Mismatched timeouts between test and product.** A test that waits N seconds while an underlying system component (queue, scheduler, polling loop) has a different timeout surfaces only under load. When you do conclude a timeout change is appropriate, the durable form is "match the test wait to an existing system-side timeout the test had drifted from", not "make the test wait longer and hope".

## Failure artifacts (FTR)

When an FTR test fails, the test runner writes diagnostic artifacts that Buildkite uploads. **A single content `<hash>` links every artifact for one failure.**

### What to download (main CI: `kibana-pull-request`, `kibana-on-merge`)

| Artifact | Path | What's in it |
| --- | --- | --- |
| Structured record | `target/test_failures/<jobId>_<hash>.{json,log,html}` | Test name, classname, owners, error, full test-runner stdout (incl. interleaved Kibana / ES server logs as `proc [kibana] [...]` lines), `commandLine` to repro, link to the existing `failed-test` issue (`githubIssue`), `failureCount`. **Start here.** `.json` is source of truth; `.log` is a human summary; `.html` is the rendered annotation. |
| Failure screenshot | `<test-root>/screenshots/failure/<title-truncated>-<hash>.png` | Viewport at failure. UI tests only. |
| DOM snapshot | `<test-root>/failure_debug/html/<title-truncated>-<hash>.html` | Full DOM at failure. UI tests only. |
| Elasticsearch logs | `.es/*.log` | When the failure looks transport / cluster related. |

`<test-root>` is the FTR config's root (e.g. `src/platform/test/functional/`, `x-pack/platform/test/serverless/shared/`). The exact screenshot path is logged in `system-out` (`info Taking window screenshot "..."`). There is no separate `kibana.log` — Kibana output is in the `.json` record's `system-out` field. `target/test_failures/` is shared with Scout; filter by `.jobName` (e.g. `FTR Configs #90` vs `Scout Lane #12`) to keep only FTR.

### How to retrieve

```sh
bk artifact download <build> "target/test_failures/<jobId>_*.json" .
bk artifact download <build> "**/screenshots/failure/*<hash>*.png" .
bk artifact download <build> "**/failure_debug/html/*<hash>*.html" .
```

### QA Cloud pipelines (`appex-qa-serverless-kibana-ftr-tests` and similar)

Different layout: one self-contained HTML per failure at `<config-path-with-underscores>-<unix-timestamp>/html/<contentHash>.html`. Contains the same test title / command / owners / error / `system-out` as the main-CI `.html`, but **no** `target/test_failures/`, **no** separate screenshot / DOM artifacts. Use the HTML directly.

### Common patterns the screenshot / DOM reveal

- **Awaited element renders but with a different `data-test-subj`** → flaky selector (recent EUI bump or refactor).
- **Loading indicator still visible** → assertion ran before UI settled; missing `retry.waitFor` upstream.
- **Unexpected error toast** → real product error; find the matching `proc [kibana] [...][ERROR]` line in `system-out`.
- **Page is logged-out / in a different space** → cleanup / auth / spaces issue in `before` / `after` hooks.

## Common error signatures (FTR)

Specific error shapes that come up repeatedly in FTR failures. Use these as a first pass when you see one in `system-out` or the failure record — each points at a category of root cause that is rarely "tweak the failing test".

| Error signature | Category | Notes |
| --- | --- | --- |
| `Unexpected dialog type beforeunload` (or any unexpected-dialog `InvalidArgumentError` during navigation) | Product / test interaction | A page is showing a `beforeunload` (or similar) prompt that blocks WebDriver navigation. Investigate which product code is registering the prompt and whether the test's navigation step needs to dismiss or avoid it — do not just retry the navigation. |
| `WebDriverError: tab crashed` | CI worker / client-side perf | The browser process died, usually under resource pressure on the CI worker, occasionally a real client-side perf regression. Validate worker load and recent client-side perf changes for the page under test before treating it as a test bug. |
| `Error: expected false to equal true` (or any boolean-only assertion message) | Test design | The assertion carries no diagnostic information — you cannot tell from the message what was actually false or why. Recommend redesigning the assertion to fail with a meaningful value (assert the actual data, not a boolean derived from it) rather than chasing the symptom from logs alone. |
