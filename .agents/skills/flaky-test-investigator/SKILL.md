---
name: flaky-test-investigator
description: >-
  Investigate Scout, FTR, and Jest flaky test failures in Kibana. Use when
  triaging a failed-test issue, a Buildkite-reported failure, a test path
  that has been failing intermittently, or any time the user asks to look at
  a flaky test, deflake a test, stabilize a test, or unskip a test.
---

# Flaky Test Investigator

Investigate a flaky Scout, FTR, or Jest test failure and identify a fix if one is available.

You should accept any of these inputs:

- A link to the GitHub `failed-test` issue. Prefer the latest failure, but review all of them.
- A test file path, plus the branch it failed on (defaults to `main`).
- A Buildkite build URL, plus enough information to identify the failing test (e.g. test name).

## Prerequisites

More access means more context on the failure:

- **GitHub API.** Run `gh auth status` to confirm `gh` is authenticated.
  - Caveat: `failed-test` issues are not always current. Closing them is up to the development teams; the convention is that if no new failure appears within 2–3 weeks, the issue can be closed.
- **Buildkite API** (for logs).
- **AppEx QA cluster.**

# What "fixing" a flaky test actually means (read this first)

A large fraction of merged "flaky test fixes" in Kibana do not hold — the same test, or a close variant, fails again within weeks or months. Treat the investigation as an exercise in **avoiding a fix that only changes the symptom**.

## The "looks like a fix vs. is a fix" gap

A few patterns recur often enough that they should reshape your defaults:

- **A green `flaky-test-runner` run is necessary but not sufficient.** Many PRs that passed flaky-test-runner all-green nonetheless recurred later. The runner cannot detect environmental coupling, slow downstream services, lane pollution, or load-pattern-dependent races. Treat the green check as one signal, not proof.
- **Fixes that change only test code recur more often than fixes that change product code.** "Fix the test, not the product" is the easy default, but a meaningful share of flaky tests are exposing real product bugs (missing awaits in handlers, racy state, unstable ordering, environment-only behavior). Always ask whether the failure could be a real defect before fixing the test.
- **A reopened `failed-test` issue is the strongest single signal that the previous fix did not work.** If the issue you are looking at, or a related one for the same path, has ever been reopened, expect the obvious fix to fail again.

## Pre-investigation: check the history

Before reading the latest failure, run these checks. They cheaply rule out "we've been here before" patterns.

1. **Has this issue been reopened?** Look at the GitHub timeline. If yes, the previous fix did not hold — re-using the same fix approach is unlikely to work.
2. **Has the test path or suite already produced multiple `failed-test` issues?** Query:

   ```bash
   gh api "search/issues?q=repo:elastic/kibana+label:failed-test+%22<path-or-suite>%22&per_page=20" \
     -q '.items[] | {n: .number, title, state, created_at}'
   ```

   If several issues match — especially recent ones — treat the test as a recurring offender (see "Recurring offenders" below).

3. **Has a prior fix PR been merged for this path?** Search merged PRs touching it. If a recent prior attempt exists, read the prior PR before proposing a new fix. The flake may have already cycled through `timeout-bump → unskip → page-object refactor → re-skip`; if so, you need a different kind of fix, not another lap around the same loop.
4. **What did the previous fix change?** If it touched only test code, the next attempt should consider whether the product needs to change. If it touched product code and still recurred, the bug may be deeper than the previous diff fixed.

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

# Investigation: understand the bigger picture

Don't just inspect the latest failure. Build a picture of the failure over time — recent failures are the most relevant, but the full history is what reveals the pattern.

## Guiding questions

- **Where is the test currently running?** Both local and Cloud pipelines, or just one? Query the AppEx QA cluster to see all recent runs.
- **Is it failing consistently?** Place the test on the spectrum from "very occasional" to "fails every run".
- **Is it failing on both local and Cloud pipelines, or just one?**
- **Did it fail in builds with many other test failures?** That points to a broader test environment issue rather than a problem with this test.
- **When did it first fail, and when did it last pass?** This narrows down the Kibana commit or PR that may have introduced the flakiness.
- **Has this issue or a related one been closed and reopened before?** A reopen is the single strongest signal that the previous fix did not hold.

## When did it start failing?

Compare the timestamps of the last successful run and the first failure. For Cloud runs, look up the Kibana commit each one used (see "Finding the Kibana commit a Cloud run used" in Background) so you can pinpoint which commit introduced the regression.

## On which pipelines did it fail?

For each Buildkite URL the test failed in:

- Understand the pipeline type (Cloud or local)
- Understand the test server configuration (for Scout and Jest tests, are the tests using **default** or **custom test servers** configuration?)
  - Tip: reference `docs/extend/scout/feature-flags.md#custom-server-configs-reach-out-to-appex-qa-first-scout-feature-flags-custom-servers` for more information on custom servers configs in Scout.

Ideally, query the AppEx QA cluster — see `references/appex-qa-cluster-queries.md`. Otherwise, read the comments on the `failed-test` issue to gauge frequency.

## Did the environment cause the failure?

Signs the environment is at fault rather than the test itself:

- **The build had many unrelated failures**: a broad pattern of failures across unrelated tests in the same build points to an infrastructure issue (agent problems, network, downstream service outage).
- **The test was polluted by another test**: most likely for Scout tests sharing a lane (see "How tests are distributed across servers"). Look at which other tests ran against the same servers in the failing build. Check if the failing builds often share the same config run order pattern.
- **The failure screenshot** could sometimes help. Example: it shows a loading Kibana logo, typically indicating that Kibana isn't completely operational.

# Investigation: assess the test itself

Once you understand the failure pattern, evaluate whether the test is worth fixing as-is.

## First, ask: is this test exposing a real product bug?

This is the single most consequential question in the investigation. Before assuming "the test is wrong", check whether the failure could be a real defect:

- **What does the assertion actually claim?** Translate it into product behavior. ("`expect(response.data).toEqual([a, b, c])`" is claiming the product returns these three values in this order.)
- **Is the failure consistent with a real bug?** Misordered array results, missing fields, intermittent 500s, slow first-response, stale state across requests, or wrong values are all symptoms of product bugs that get attributed to "flakiness".
- **Is there an awaited or non-awaited handler on the product side?** A missing `await` in product code is a common root cause; the test only flakes because the product is racy.
- **Does the failure correlate with a particular environment** (e.g., only serverless, only stateful, only MKI, only on slower agents)? Environment-only failures often surface real product behavior that the test was implicitly relying on.

If you can build a plausible story that the failure is real, write a one-paragraph "what the product is doing wrong" summary in the PR body.

## Consider alternatives before fixing

Before attempting a fix, consider:

- **Delete the test.** Do other tests already cover what this one is testing?
- **Refactor or downgrade the test.** See "Pick the right test type" in `docs/extend/scout/best-practices.md`. A functional test can often become an API, component, or Jest unit/integration test.
  - **Caveat:** "migrate this Jest test to RTL" or "convert this to a unit test" PRs commonly land on a flaky-test issue without addressing the underlying flake. Downgrading test type is good hygiene, but the test rewrite alone is rarely the fix — the underlying problem (often a missing await or shared state) must also be addressed, or the new test will inherit the flake.
- **Update the tags.** Are the test's tags still appropriate? Should it run on Cloud? Should it be excluded from certain serverless solution types (e.g. Security)?

## Does the test follow best practices?

Common best-practice violations that cause flakiness:

- **Pick the right test type** (`docs/extend/kibana/scout/best-practices#pick-the-right-test-type`). UI tests are notoriously more flaky than component, API, and Jest unit/integration tests.
- **Prefer APIs for setup and teardown** (`docs/extend/kibana/scout/ui-best-practices#prefer-kibana-apis-over-ui-for-setup-and-teardown`). Driving setup/teardown through the UI is slower and flakier.
- **Wait for UI updates after actions** (`docs/extend/kibana/scout/ui-best-practices#wait-for-ui-updates-when-the-next-action-requires-it`). Confirm the action produced the expected result and the UI has rendered before continuing.
- **Wait for complex UI to finish rendering** (`docs/extend/kibana/scout/ui-best-practices#wait-for-complex-components-to-fully-render`).

Scout and FTR tests should also follow the general best practices in `docs/extend/scout/best-practices.md`, the UI best practices in `docs/extend/scout/ui-best-practices.md`, and the API best practices in `docs/extend/scout/api-best-practices.md`.

## Scout-specific checks

When investigating a Scout failure, weight these checks higher:

- **Lane pollution.** Scout tests in the same Playwright lane share servers (see "How tests are distributed across servers"). Look at which other configs ran in the same lane in the failing build. If the same neighbor configs appear repeatedly in failing builds, suspect cross-test state leakage.
- **Page-object brittleness.** Page-object rewrites are a common "fix" that often does not hold. If you're touching a page object, confirm the change addresses a root cause (e.g., the previous locator was racing with rendering) rather than being a cleaner-looking rewrite of the same race.
- **Poll/timeout values.** Bumping a Scout poll timeout is a frequent and frequently-recurring fix. Before adding to that pile, confirm the slow operation is intrinsic to the product (e.g., index creation, SLO calculation) rather than a missing `waitForResponse` or `waitForSelector` somewhere upstream.
- **Whole-suite recurrence.** Some Scout suites (e.g., parts of the Streams plugin, Observability dashboards) generate clusters of `failed-test` issues that share infrastructure problems. If multiple sibling specs in the same suite are flaky, expect a structural fix rather than a single-test patch.

# Fix patterns and how durable they tend to be

When you've decided what kind of fix you want to apply, check it against this list before proceeding further.

## Patterns that often look like a fix but frequently do not hold

Treat these as "may not be enough" rather than "this is the fix":

- **Add `await` / `waitFor` / replace `sleep`.** Often correct, but only if you can identify _which_ missing wait was the root cause. Adding waits speculatively tends to move the race rather than remove it.
- **Rewrite a page object.** Document specifically which interaction was racy or fragile and why the new code fixes it. A cleaner-looking page object is not by itself a fix.
- **Bump a timeout, poll duration, or retry count.** If the test is slow because the product is slow, fix the product or the test setup, not the timeout. Use this as a last resort, and only with a follow-up planned for the underlying issue.
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

When the test is a recurring offender, escalate to the owning team rather than landing a one-line fix; the suite likely needs structural work (shared fixture, environment isolation, fundamental test redesign, or a product-side fix).

# Pre-PR self-check

Before opening or recommending a fix PR, walk through this checklist. Items that fail mean the fix is unlikely to hold.

```
- [ ] I can name the root cause in one sentence (not "the test is flaky").
- [ ] My one-sentence root cause describes either a product behavior, a test-isolation problem, or an environment coupling — not "the previous code timed out".
- [ ] If I'm only changing test code, I can articulate why the product side is correct and does not need to change.
- [ ] If I'm bumping a timeout, adding a retry, or skipping: I have a separate follow-up planned to address the root cause, and the PR body says so.
- [ ] I checked whether the same path or suite has been a recurring offender. If yes, my fix addresses the structural problem, or I have looped in the owning team.
- [ ] I checked whether the original issue was previously reopened. If yes, my fix is meaningfully different from the previous one.
- [ ] If I ran flaky-test-runner and it passed, I treat that as one signal, not proof.
- [ ] My PR title does NOT use "stabilize", "deflake", "[Flaky Test]", or "another attempt at" unless I have a strong story for why this attempt is different — those titles often appear on third- and fourth-attempt PRs that go on to recur.
```

# Investigation pitfalls

Common bad instincts when fixing a flaky test. Each of these can make the symptom go away while leaving the underlying problem — or worse, hiding a real bug.

- **Ignoring the bigger picture.** Don't fix in isolation. The flakiness may have been transient, may point to a broader environment issue, or may be a signal that the test should be rewritten or removed (see "Investigation: assess the test itself").
- **Raising timeouts or retry counts.** Rarely the right fix. Treat it as a last resort and exhaust other options first; timeout-bump fixes commonly come back.
- **Weakening assertions.** Don't make assertions more lenient or narrow their scope just to make the test pass; that hides regressions instead of catching them.
- **Reducing coverage surface.** Don't strip tags to skip the test in certain environments (e.g. Cloud) or project types (e.g. serverless Security) unless you have a real reason it shouldn't run there. "It's flaky here" is not a real reason.
- **Trusting flaky-test-runner alone.** A green 30/30 or 60/60 run does not prove the fix held. The runner cannot detect environmental coupling, slow ES indices, downstream test pollution, or load-pattern-dependent races.
- **Assuming "fix the test, not the product".** This is the team's default but it is the more recurrence-prone choice. Always ask first whether the product could be at fault.

# Reporting

When you summarize your investigation, structure the output as:

1. **What the test does** (one paragraph).
2. **What failed and when** (most recent failure + count of failures over time + last-known-good).
3. **Where it ran** (pipelines, configs, cloud vs local).
4. **Root cause hypothesis** (one sentence: product, test isolation, race, environment, or unknown).
5. **Recommended fix or next step**, with the pattern from "Fix patterns and how durable they tend to be" and an honest note on expected durability.
6. **Whether this is a recurring offender**, and if yes, who should own the structural work.
7. **Open questions** the investigation could not resolve.

This ordering mirrors the diagnostic flow and surfaces the highest-leverage facts first.
