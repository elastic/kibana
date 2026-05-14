---
name: flaky-test-investigator
description: >-
  Investigate Scout, FTR, and Jest flaky test failures in Kibana. Use when
  triaging a failed-test issue, a Buildkite-reported failure, a test path
  that has been failing intermittently, or any time the user asks to look at
  a flaky test, deflake a test, stabilize a test, or unskip a test.
---

# Flaky Test Investigator

Investigate a flaky Scout, FTR, or Jest test failure and reach a sound conclusion about what is actually happening and what should be done about it.

**The goal is the right diagnosis, not a PR.** A confident "this is a real product bug, escalate to team X", "this is environmental and will likely self-resolve", or "this is a recurring offender that needs structural work" is a successful outcome. A patch that hides the symptom is not.

You should accept any of these inputs:

- A link to the GitHub `failed-test` issue.
- A test file path, plus the branch it failed on (defaults to `main`).
- A Buildkite build URL, plus enough information to identify the failing test (e.g. test name).

## Prerequisites

More access means more context on the failure:

### Buildkite

Use the `bk` CLI when interacting with Buildkite. Create a token at https://buildkite.com/user/api-access-tokens and export it as `BUILDKITE_API_TOKEN`. Required scopes:

- `read_builds`: browse pipelines, builds, and job logs.
- `read_artifacts`: list and download build artifacts (Scout HTML failure reports, screenshots, FTR failure-debug HTML, etc.). See "Did the environment cause the failure?" for the specific paths and how to use them.

### GitHub

Run `gh auth status` to confirm `gh` is authenticated.

# What "fixing" a flaky test actually means

A large fraction of merged "flaky test fixes" in Kibana do not hold — the same test, or a close variant, fails again within weeks or months. The investigation's job is to **understand the failure well enough to avoid a conclusion that only changes the symptom**.

## The "looks like a fix vs. is a fix" gap

A few patterns recur often enough that they should reshape your defaults:

- **A green `flaky-test-runner` run is necessary but not sufficient.** Many PRs that passed flaky-test-runner all-green nonetheless recurred later. The runner cannot detect environmental coupling, slow downstream services, lane pollution, or load-pattern-dependent races. Treat the green check as one signal, not proof.
- **Conclusions that blame only test code recur more often than conclusions that identify a product issue.** "Fix the test, not the product" is the easy default, but a meaningful share of flaky tests are exposing real product bugs (missing awaits in handlers, racy state, unstable ordering, environment-only behavior). Always ask whether the failure could be a real defect before concluding the test is the problem.
- **A reopened `failed-test` issue is the strongest single signal that the previous diagnosis was wrong.** If the issue you are looking at, or a related one for the same path, has ever been reopened, expect the obvious explanation to be incomplete.

## Pre-investigation: check the history

Before reading the latest failure, run these checks. They cheaply rule out "we've been here before" patterns.

1. **Has this issue been reopened?** Look at the GitHub timeline. If yes, the previous diagnosis did not hold — re-using the same line of reasoning is unlikely to land somewhere new. Note that an `open` state alone is not proof the test is still flaky: closing `failed-test` issues is up to the development teams, and the convention is that an issue can be closed if no new failure appears within 2–3 weeks. Always cross-check against recent build history.
2. **Has the test path or suite already produced multiple `failed-test` issues?** Query:

   ```bash
   gh api "search/issues?q=repo:elastic/kibana+label:failed-test+%22<path-or-suite>%22&per_page=20" \
     -q '.items[] | {n: .number, title, state, created_at}'
   ```

   If several issues match — especially recent ones — treat the test as a recurring offender (see "Recurring offenders" below).

3. **Has a prior fix PR been merged for this path?** Search merged PRs touching it. If a recent prior attempt exists, read the prior PR before drawing conclusions. The flake may have already cycled through `timeout-bump → unskip → page-object refactor → re-skip`; if so, the same kind of conclusion will produce the same kind of outcome.
4. **What did the previous fix change, and what did it claim?** If it touched only test code and the test recurred, the next investigation should weigh the product side more heavily. If it touched product code and still recurred, the bug may be deeper than the previous diff captured.

# Background

Read this section once. Refer back to it as needed during the investigation.

## Cloud and local pipelines

Tests run either on Elastic Cloud ("Cloud pipeline") or on the machine that triggered the run ("local pipeline", a.k.a. "Kibana CI"). A test that passes locally on the agent's machine may still fail on Cloud. Use the pipeline name to identify where the test ran.

### Elastic Cloud pipelines

- Slugs follow the pattern `appex-qa-{serverless|stateful}-kibana-{ftr|scout}-tests`.
- Each run provisions real Cloud projects or deployments and tests against them.
- Projects and deployments are created in the QA environment via the internal QAF tool, which calls the Elastic Cloud API.
- Cloud runs happen only three times a day because they are expensive.
- **No server configuration overrides are allowed on Cloud.** Projects and deployments are provisioned exactly as a customer would have them — you cannot override YAML settings or pass custom Kibana/Elasticsearch arguments.
- Scout Cloud pipelines run Scout tests tagged `@cloud-*`.

### Local pipelines

- Common examples: `kibana-on-merge`, `kibana-pull-request`, `kibana-flaky-test-suite-runner`. Any non-Cloud pipeline is "local".
- Test servers start on the agent's local machine with no external dependencies, giving a more stable environment.
- Run Scout tests tagged `@local-*`.

### Key differences between Kibana CI and Cloud

A pass on a developer's machine, in Kibana CI, or in the flaky test runner does not guarantee a pass on Cloud. Key differences:

- **Performance:** Cloud has higher latency (especially MKI) and more transient errors, including network errors.
- **Configuration:** Cloud provisions projects and deployments as a customer would. Server configuration cannot be overridden.
- **Security:** the local environment only approximates Cloud's security model. With UIAM enabled, features that rely on API keys may behave differently on Cloud, particularly in serverless.
- **Serverless:** for serverless tests, Kibana CI and the flaky test runner use a local Docker-based simulation, not a real Cloud environment.

Runs can stop unexpectedly due to agent loss. Buildkite retries these automatically.

### Finding the Kibana commit a Cloud run used

Cloud pipelines do not build Kibana from source — they use a Kibana commit that may lag `main` by several hours. To identify which commit a run used, look for `Build hash:` in the Buildkite logs (e.g. `Build hash: 3927e36048a3a57f0657e06bc224736af8e322f8`):

- **Serverless Cloud projects:** under `Project information`. The log group starts with `Create {security|observability|...} project`.
- **Stateful Cloud deployments:** under `Deployment information`. The log group starts with `Create deployment`.

## How tests are distributed across servers

How tests share or isolate test servers affects whether one test can be polluted by another.

- **Scout:** tests are split into lanes. All Playwright configs in the same lane run against the same test servers, so state can leak between configs.
- **FTR:** tests are divided into groups. A fresh set of test servers is started for each config, so cross-config pollution is unlikely.

# Investigation

## Understand the bigger picture

Don't just inspect the latest failure. Build a picture of the failure over time — recent failures are the most relevant, but the full history is what reveals the pattern.

### Guiding questions

- **Is it failing consistently?** Place the test on the spectrum from "very occasional" to "fails every run".
- **Is it failing on both local and Cloud pipelines, or just one?**
- **Did it fail in builds with many other test failures?** That points to a broader test environment issue rather than a problem with this test.
- **When did it first fail, and when did it last pass?** This narrows down the Kibana commit or PR that may have introduced the flakiness.
- **Has this issue or a related one been closed and reopened before?** A reopen is the single strongest signal that the previous diagnosis did not hold.

### When did it start failing?

Compare the timestamps of the last successful run and the first failure. For Cloud runs, look up the Kibana commit each one used (see "Finding the Kibana commit a Cloud run used" in Background) so you can pinpoint which commit introduced the regression.

### On which pipelines did it fail?

For each Buildkite URL the test failed in:

- Understand the pipeline type (Cloud or local).
- Understand the test server configuration (for Scout and Jest tests, are the tests using **default** or **custom test servers** configuration?).
  - Tip: reference `docs/extend/scout/feature-flags.md#custom-server-configs-reach-out-to-appex-qa-first-scout-feature-flags-custom-servers` for more information on custom servers configs in Scout.

Read the comments on the `failed-test` issue and the linked Buildkite builds to gauge frequency.

### Did the environment cause the failure?

Signs the environment is at fault rather than the test itself:

- **The build had many unrelated failures.** A broad pattern of failures across unrelated tests in the same build points to an infrastructure issue (agent problems, network, downstream service outage).
- **The test was polluted by another test.** Most likely for Scout tests sharing a lane (see "How tests are distributed across servers"). Look at which other tests ran against the same servers in the failing build. Check whether the failing builds often share the same config run order pattern.
- **Failure screenshots and HTML reports** are uploaded as Buildkite artifacts and are often the fastest way to see what actually happened at the point of failure.
  - **Scout (preferred entry point): the per-failure HTML report.** For each failed test, Scout writes a self-contained `<failure-id>.html` to `.scout/reports/scout-playwright-test-failures-*/`, bundling the error message + stack trace, stdout, test metadata (suite, title, target, owner, Kibana module, duration), and screenshots inlined as base64. A sibling `test-failures-summary.json` lists each failure with its HTML filename — use it as an index. Standalone screenshots are also uploaded under `.scout/test-artifacts/**/*.png` if you only need the image.
  - **FTR:** screenshots under `**/screenshots/failure/*.png` and a page snapshot at `**/failure_debug/html/*.html`.
  - Use the Buildkite artifacts API (see the `buildkite-logs` skill) with a `read_artifacts` token to list and download them. A loading Kibana logo in the screenshot, for example, typically indicates Kibana wasn't fully operational.

## Assess the test itself

Once you understand the failure pattern, evaluate what the test is really telling you.

### First, ask: is this test exposing a real product bug?

This is the single most consequential question in the investigation. Before concluding "the test is wrong", check whether the failure could be a real defect:

- **What does the assertion actually claim?** Translate it into product behavior. (`expect(response.data).toEqual([a, b, c])` is claiming the product returns these three values in this order.)
- **Is the failure consistent with a real bug?** Misordered array results, missing fields, intermittent 500s, slow first-response, stale state across requests, or wrong values are all symptoms of product bugs that get attributed to "flakiness".
- **Is there an awaited or non-awaited handler on the product side?** A missing `await` in product code is a common root cause; the test only flakes because the product is racy.
- **Does the failure correlate with a particular environment** (e.g. only serverless, only stateful, only MKI, only on slower agents)? Environment-only failures often surface real product behavior that the test was implicitly relying on.

If you can build a plausible story that the failure is real, write that story down explicitly as part of your conclusion. Hand-waving "the test is just flaky" is the failure mode this skill is designed to prevent.

### Consider alternatives before recommending a code fix

Once you have a diagnosis, the right next step is not always a code change. Consider:

- **Delete the test.** Do other tests already cover what this one is testing?
- **Refactor or downgrade the test.** See "Pick the right test type" in `docs/extend/scout/best-practices.md`. A functional test can often become an API, component, or Jest unit/integration test.
  - **Caveat:** "migrate this Jest test to RTL" or "convert this to a unit test" is commonly proposed on a flaky-test issue without addressing the underlying flake. Downgrading test type is good hygiene, but the rewrite alone is rarely the fix — the underlying problem (often a missing await or shared state) must also be addressed, or the new test will inherit the flake.
- **Update the tags.** Are the test's tags still appropriate? Should it run on Cloud? Should it be excluded from certain serverless solution types (e.g. Security)?
- **Escalate to the owning team.** If this is a recurring offender or you suspect a product bug, the most useful conclusion may be a writeup handed to the owners, not a fix attempt.

### Does the test follow best practices?

Common best-practice violations that cause flakiness:

- **Pick the right test type** (`docs/extend/kibana/scout/best-practices#pick-the-right-test-type`). UI tests are notoriously more flaky than component, API, and Jest unit/integration tests.
- **Prefer APIs for setup and teardown** (`docs/extend/kibana/scout/ui-best-practices#prefer-kibana-apis-over-ui-for-setup-and-teardown`). Driving setup/teardown through the UI is slower and flakier.
- **Wait for UI updates after actions** (`docs/extend/kibana/scout/ui-best-practices#wait-for-ui-updates-when-the-next-action-requires-it`). Confirm the action produced the expected result and the UI has rendered before continuing.
- **Wait for complex UI to finish rendering** (`docs/extend/kibana/scout/ui-best-practices#wait-for-complex-components-to-fully-render`).

Scout and FTR tests should also follow the general best practices in `docs/extend/scout/best-practices.md`, the UI best practices in `docs/extend/scout/ui-best-practices.md`, and the API best practices in `docs/extend/scout/api-best-practices.md`.

### Scout-specific checks

When investigating a Scout failure, weight these checks higher:

- **Lane pollution.** Scout tests in the same Playwright lane share servers (see "How tests are distributed across servers"). Look at which other configs ran in the same lane in the failing build. If the same neighbor configs appear repeatedly in failing builds, suspect cross-test state leakage.
- **Worker load on shared servers (parallel configs).** Scout configs that opt in to parallelism (typically named `parallel.playwright.config.ts` and passing `workers > 1`) run multiple Playwright workers against the same Kibana/Elasticsearch test servers. Under load, this can manifest as slow responses, occasional timeouts, or transient errors that look test-specific but are really resource pressure. Worth keeping in mind when interpreting timeout-shaped failures in a parallel config — it is _not_ by itself a reason to drop `workers` back to 1. Consider it especially when the same test passes in isolation but flakes only in the full parallel run.
- **Page-object brittleness.** Page-object rewrites are a common "fix" that often does not hold. If a page-object change is on the table, confirm it addresses a root cause (e.g. the previous locator was racing with rendering) rather than being a cleaner-looking rewrite of the same race.
- **Poll/timeout values.** Bumping a Scout poll timeout is a frequent and frequently-recurring fix. Before recommending one, confirm the slow operation is intrinsic to the product (e.g. index creation, SLO calculation) rather than a missing `waitForResponse` or `waitForSelector` somewhere upstream.
- **Whole-suite recurrence.** Some Scout suites (e.g. parts of the Streams plugin, Observability dashboards) generate clusters of `failed-test` issues that share infrastructure problems. If multiple sibling specs in the same suite are flaky, expect a structural conclusion rather than a single-test patch.

### FTR-specific checks

When investigating an FTR failure, weight these checks higher:

- **`retry.tryForTime reached timeout` / `retry.try reached timeout` is a diagnostic signal, not a knob.** If the failure stack already shows a retry-helper timeout, the awaited state is not arriving — raising the duration almost never fixes the underlying cause. Investigate *what* the retry is waiting for and why it never settles.
- **What the retry wraps matters more than whether one is added.** `retry.try` / `retry.tryForTime` / `retry.waitFor` tend to hold when wrapping operations that are genuinely eventually consistent (Fleet/EPM install, EBT telemetry events, saved-object indexing propagation, task-manager pickup). They tend to recur when wrapping a page-object helper whose real problem is silent failure or a stale locator — in those cases the right fix is upstream of the retry.
- **Audit page-object helpers for silent-failure anti-patterns** when the failure manifests as `Cannot read properties of undefined` or "click on a thing that was never rendered". Two patterns repeatedly cause this:
  - `testSubjects.exists()` inside an `if` — silently skips the action when the element isn't ready, leaving the caller to operate on absent state.
  - Unguarded `testSubjects.findAll(...)[0]` — returns `[]` when nothing has rendered, crashes on the index access.
  Replace either with an explicit wait (`retry.waitFor(...)` then assert) so a missing element fails loudly instead of corrupting test state.
- **Cross-test state leakage in serverless suites.** FTR generally provisions fresh servers per config, but serverless functional suites running against shared clusters can accumulate leftover indices, transforms, rules, spaces, or saved objects across tests in the same config. When a failure depends on test ordering, look at the cleanup story (`afterAll` / `afterEach`) for the suite, not just the specific failing test.
- **Mismatched timeouts between test and product.** A test that waits N seconds while an underlying system component (queue, scheduler, polling loop) has a different timeout surfaces only under load. When you do conclude a timeout change is appropriate, the durable form is "match the test wait to an existing system-side timeout the test had drifted from", not "make the test wait longer and hope".

# Fix patterns and how durable they tend to be

When weighing what conclusion to reach, check it against this list. The categories below describe how durable each kind of fix tends to be — useful both for evaluating a proposed approach and for honestly characterizing your recommendation.

## Patterns that often look like a fix but frequently do not hold

Treat these as "may not be enough" rather than "this is the fix":

- **Add `await` / `waitFor` / replace `sleep`.** Often correct, but only if you can identify _which_ missing wait was the root cause. Adding waits speculatively tends to move the race rather than remove it.
- **Rewrite a page object.** A cleaner-looking page object is not by itself a fix. Be able to state specifically which interaction was racy or fragile and why the new approach addresses it.
- **Bump a timeout, poll duration, or retry count.** If the test is slow because the product is slow, the product or the test setup is the right target, not the timeout. Last resort, with a follow-up planned for the underlying issue.
- **Update a snapshot.** Confirms the new value is "current" without addressing why the value drifted. Rarely a real fix on its own.
- **Migrate a test to RTL or to a smaller test type.** Good hygiene, but the rewrite itself usually inherits the underlying flake (missing await, shared state, ordering assumption) if you don't also address it.

## Patterns that tend to hold

Prefer these when the failure mode fits:

- **Fix the product.** When the failing assertion can be plausibly read as a real product bug, changing the product to behave correctly is the most durable fix available. This is also the option investigators reach for least often, so it's worth a deliberate look.
- **Test isolation & cleanup.** Add proper `afterEach` / `afterAll` teardown, reset shared state, remove leftover fixtures between tests. The most durable test-only category.
- **Remove ordering / comparison non-determinism.** Sort before compare, replace strict equality with set semantics, decouple assertions from response order, use separate `expect` clauses for the fields that actually matter.

## Recurring offenders

Some test paths and suites generate flaky-test issues at a rate that cannot be addressed by patching individual specs. Signs you are looking at a recurring offender:

- The same path appears in many `failed-test` issues over several months (use the `gh api search/issues` query above).
- Multiple sibling specs in the same suite have their own open `failed-test` issues.
- The history shows a sequence of partial fixes: `timeout-bump → unskip → page-object rewrite → re-skip`.
- The `failed-test` issue has been closed and reopened.

For a recurring offender, the right conclusion is usually "escalate to the owning team with a writeup" rather than "land a one-line fix". The suite likely needs structural work (shared fixture, environment isolation, fundamental test redesign, or a product-side fix).

# Conclusion self-check

Before reporting your conclusion, walk through this checklist. Items that fail mean the conclusion is not yet solid — keep investigating or be explicit that you couldn't get further.

- [ ] I can name the root cause in one sentence (not "the test is flaky").
- [ ] That sentence describes either a product behavior, a test-isolation problem, or an environment coupling — not "the previous code timed out".
- [ ] If my conclusion blames only the test, I can articulate why the product side is correct and does not need to change.
- [ ] If my recommended next step is a timeout bump, retry, or skip, I have explicitly flagged it as a symptom-level mitigation and named a separate follow-up for the root cause.
- [ ] I checked whether the same path or suite has been a recurring offender. If yes, my conclusion accounts for the structural problem, not just this one failure.
- [ ] I checked whether the original issue was previously reopened. If yes, my conclusion is meaningfully different from the previous one — or I have stated explicitly why the previous reasoning still applies.
- [ ] I am not relying on a hypothetical flaky-test-runner pass as proof. The runner can confirm a fix is plausible; it cannot confirm a fix is durable.
- [ ] I have stated my confidence level honestly. "Likely environmental, low confidence" is a valid conclusion. "The test is flaky, fixed by retry" is not.

# Investigation pitfalls

Common bad instincts when concluding a flaky test investigation. Each of these can make the symptom go away while leaving the underlying problem — or worse, hiding a real bug.

- **Ignoring the bigger picture.** Don't draw conclusions from a single failure. The flakiness may have been transient, may point to a broader environment issue, or may be a signal that the test should be rewritten or removed (see "Assess the test itself").
- **Reaching for timeouts or retries.** Rarely the right conclusion. Treat it as a last resort; timeout-bump fixes commonly come back.
- **Weakening assertions.** Don't recommend making assertions more lenient or narrowing their scope just to make the test pass; that hides regressions instead of catching them.
- **Reducing coverage surface.** Don't recommend stripping tags to skip the test in certain environments (e.g. Cloud) or project types (e.g. serverless Security) unless you have a real reason it shouldn't run there. "It's flaky here" is not a real reason.
- **Trusting flaky-test-runner alone.** A green 30/30 or 60/60 run does not prove a fix held. The runner cannot detect environmental coupling, slow ES indices, downstream test pollution, or load-pattern-dependent races.
- **Assuming "fix the test, not the product".** This is the team's default but it is the more recurrence-prone choice. Always ask first whether the product could be at fault.
- **Reporting false certainty.** "I don't know, here are the two plausible explanations and what would distinguish them" is more useful to the owning team than a confident wrong answer.

# Reporting

When you report your conclusion, structure the output as:

1. **What the test does** (one paragraph).
2. **What failed and when** (most recent failure + count of failures over time + last-known-good).
3. **Where it ran** (pipelines, configs, Cloud vs local).
4. **Root cause hypothesis, with confidence level** (one sentence: product, test isolation, race, environment, or unknown — and how sure you are).
5. **Evidence supporting that hypothesis**, and evidence against it. If you considered alternative hypotheses, name them and say what would distinguish them.
6. **Recommended next step.** This is not always a code change — it may be "escalate to team X", "wait and see, likely transient", or "owning team should look at the whole suite". If you are recommending a code fix, cite the relevant pattern from "Fix patterns and how durable they tend to be" and give an honest note on expected durability.
7. **Whether this is a recurring offender**, and if yes, who should own the structural work.
8. **Open questions** the investigation could not resolve.

This ordering surfaces the highest-leverage facts first and makes it easy for the next reader to see _why_ the conclusion holds, not just _what_ it is.
