# FTR

## Test distribution

FTR tests are divided into groups. A fresh set of test servers is started for each config, so cross-config pollution is unlikely.

## Investigation help

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

When an FTR test fails, the test runner uploads diagnostic artifacts to the Buildkite build. Pull these first before forming a hypothesis.

- **Screenshot**: `failure_screenshot_session_*_<test-name>.png`. The browser viewport at the moment `expect()` failed. For UI-driven FTR tests this is usually the highest-signal artifact.
- **DOM snapshot**: `failure_debug_html_*_<test-name>.html`. The full DOM at failure time. Open it locally in a browser to see exactly what state the page was in — the awaited element may simply have a different `data-test-subj`, be inside a different shadow root, or not be in the DOM at all.
- **Server logs**: `kibana.log`, `elasticsearch.log` (and `fleet-server.log`, `apm.log`, etc. depending on the test). Use the failure timestamp to find correlated errors. A 500 in `kibana.log` at the failure moment is strong evidence the bug is product-side.
- **Test runner stdout**: contains the full stack trace, the `retry.tryForTime` budget reached, and any `log.debug` / `log.info` lines emitted by the test itself.

How to retrieve them:

- From the Buildkite job page: scroll to the "Artifacts" section.
- From the CLI: `bk artifact download <build> "**/*.png" .` (requires `read_artifacts` scope).
- Direct API call: `GET https://api.buildkite.com/v2/.../jobs/<job-id>/artifacts` then download by `download_url`.

Common FTR-specific patterns the screenshot/DOM reveal:

- **The awaited element renders but with a different `data-test-subj`** → flaky selector, often introduced by a recent EUI bump or a refactor.
- **A loading indicator is still visible at failure time** → the test asserts before the UI settles; usually means a missing `retry.waitFor` upstream of the assertion, not a missing one at the assertion (see "What the retry wraps matters" above).
- **An unexpected error toast is visible** → real product error; trace it to `kibana.log`.
- **Page is logged-out or in a different space** → cleanup / authentication / spaces issue; look at the suite's `before` / `after` hooks.
