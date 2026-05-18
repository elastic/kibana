# FTR

## Test distribution

FTR tests are divided into groups. A fresh set of test servers is started for each config, so cross-config pollution is unlikely.

## Investigation help

When investigating an FTR failure, weight these checks higher:

- **`retry.tryForTime reached timeout` / `retry.try reached timeout` is a diagnostic signal, not a knob.** If the failure stack already shows a retry-helper timeout, the awaited state is not arriving — raising the duration almost never fixes the underlying cause. Investigate _what_ the retry is waiting for and why it never settles.
- **What the retry wraps matters more than whether one is added.** `retry.try` / `retry.tryForTime` / `retry.waitFor` tend to hold when wrapping operations that are genuinely eventually consistent (Fleet/EPM install, EBT telemetry events, saved-object indexing propagation, task-manager pickup). They tend to recur when wrapping a page-object helper whose real problem is silent failure or a stale locator — in those cases the right fix is upstream of the retry.
- **Audit page-object helpers for silent-failure anti-patterns** when the failure manifests as `Cannot read properties of undefined` or "click on a thing that was never rendered". Two patterns repeatedly cause this:
  - `testSubjects.exists()` inside an `if` — silently skips the action when the element isn't ready, leaving the caller to operate on absent state.
  - Unguarded `testSubjects.findAll(...)[0]` — returns `[]` when nothing has rendered, crashes on the index access.
    Replace either with an explicit wait (`retry.waitFor(...)` then assert) so a missing element fails loudly instead of corrupting test state.
- **Cross-test state leakage in serverless suites.** FTR generally provisions fresh servers per config, but serverless functional suites running against shared clusters can accumulate leftover indices, transforms, rules, spaces, or saved objects across tests in the same config. When a failure depends on test ordering, look at the cleanup story (`afterAll` / `afterEach`) for the suite, not just the specific failing test.
- **Mismatched timeouts between test and product.** A test that waits N seconds while an underlying system component (queue, scheduler, polling loop) has a different timeout surfaces only under load. When you do conclude a timeout change is appropriate, the durable form is "match the test wait to an existing system-side timeout the test had drifted from", not "make the test wait longer and hope".
