---
name: flaky-test-investigator
description: >-
  Investigate Scout, FTR, and Jest flaky test failures in Kibana. Use when
  triaging a failed-test issue, a Buildkite-reported failure, a test path
  that has been failing intermittently, or any time the user asks to look at
  a flaky test, deflake a test, or stabilize a test.
---

# Flaky Test Investigator

Investigate a flaky Scout, FTR, or Jest test failure and determine what should be done about it.

- The outcome should be an accurate diagnosis, not a quick fix that treats the symptom.
- Valid outcomes include "this is a real product bug, escalate to the owning team", "this is environmental and will likely self-resolve", or "there isn't enough data to draw a confident conclusion".

## Prerequisites

### Buildkite access

You may access Buildkite either with `bk` CLI or direct API calls (ensure `BUILDKITE_API_TOKEN` variable exported with the Buildkite token). Required Buildkite token scopes:

- `read_builds`: browse pipelines, builds, and job logs.
- `read_artifacts`: list and download build artifacts (Scout HTML failure reports, screenshots, FTR failure-debug HTML, etc.). See "Did the environment cause the failure?" for the specific paths and how to use them.

### GitHub access

Run `gh auth status` to confirm `gh` is authenticated.

## Investigation

### Identify the failing GitHub issue

If no link to a `failed-test` issue was provided, search for one in the `elastic/kibana` repository. Prioritize looking at thee recent failures, but all failures and issue comments should be looked at.

### Understand the test environment

- **Is it failing on `kibana-on-merge` (local pipeline), on Cloud pipelines, or both?**
  - _Why it matters:_ tells you whether the test is compatible with Elastic Cloud at all, and whether the failure is more likely environmental (more common on Cloud) or a defect in the test itself (more common when both fail).
  - Recommended: learn more about local versus Elastic Cloud pipelines in `reference/local-vs-cloud-pipelines.md`
- **Did it fail in Buildkite builds with many other unrelated test failures?**
  - _Why it matters:_ broad failure across unrelated tests points to an environment or infrastructure problem, not a problem with this test.
- **Understand the test server configuration.** are Scout tests using the **default** or a **custom** test server configuration? Do FTR tests belong to a test config that defines custom server arguments that aren't supported on e.g., Elastic Cloud?
  - _Why it matters:_ custom server configurations are a common source of flakiness — they diverge from the configurations used by the broader test suite, so issues affecting only them won't surface elsewhere. They also tend to be less actively maintained.

### Understand the scope

Work through all of these questions:

- **How often is the test failing? Are there time spans when it failed most?** Place the test on the spectrum from "fails very occasionally" (e.g. twice this year) to "fails on every CI run".
  - _Why it matters:_ concentrated failures point to a specific cause tied to that window (a bad commit, an infrastructure incident, a dependency change).
- **When did the test last fail?**
  - _Why it matters:_ if the last failure was 2–3 weeks ago and there are no new comments on the `failed-test` issue, the flakiness may have already resolved itself — intentionally or as a side effect of unrelated changes.
- **Are other tests in the same suite or config failing with similar or identical errors?**
  - _Why it matters:_ shared failure modes point to shared building blocks (page objects, fixtures, setup) and usually call for a structural change rather than a per-test patch.
- **Did it fail on a specific version branch?**
  - _Why it matters:_ if the failure isn't happening on `main`, compare the branches to identify what's different. The branch that passes tells you what `main` is missing (or what it added).
- **When did it first fail, and when did it last pass?**
  - _Why it matters:_ narrows down the Kibana commit or PR that may have introduced the flakiness.
- **Has this issue or a related one been closed and reopened before?**
  - _Why it matters:_ a reopen is the single strongest signal that the previous diagnosis did not hold. Don't repeat the previous line of reasoning.
- **Has a prior fix PR been merged for this test or path?** Search merged PRs that touched the test or related files.
  - _Why it matters:_ understand what's been done so far to fix flakiness.
- **What did the previous fix change, and what did it claim to address?**
  - _Why it matters:_ if it touched only test code and the test recurred, weigh the product side more heavily this time. If it touched product code and still recurred, the real bug is likely deeper than the previous diff captured.

### Does the test follow best practices?

Common best-practice violations that cause flakiness:

- **Pick the right test type** (`docs/extend/kibana/scout/best-practices#pick-the-right-test-type`). UI tests are notoriously more flaky than component, API, and Jest unit/integration tests.
- **Prefer APIs for setup and teardown** (`docs/extend/kibana/scout/ui-best-practices#prefer-kibana-apis-over-ui-for-setup-and-teardown`). Driving setup/teardown through the UI is slower and flakier.
- **Wait for UI updates after actions** (`docs/extend/kibana/scout/ui-best-practices#wait-for-ui-updates-when-the-next-action-requires-it`). Confirm the action produced the expected result and the UI has rendered before continuing.
- **Wait for complex UI to finish rendering** (`docs/extend/kibana/scout/ui-best-practices#wait-for-complex-components-to-fully-render`).

Scout and FTR tests should also follow the general best practices in `docs/extend/scout/best-practices.md`, the UI best practices in `docs/extend/scout/ui-best-practices.md`, and the API best practices in `docs/extend/scout/api-best-practices.md`.

### Practical guidance

Identify the test runner for the failing test(s) and follow the framework-specific investigation guidance:

- Scout: `reference/scout.md`
- FTR: `reference/ftr.md`

### Investigation pitfalls

Watch out for these pitfalls when investigating the failure:

- **Ignoring the bigger picture**: ensure you have as much data as you can about the test environment and related failures (in the same test file, test config or elsewhere)
- **Increasing timeouts or retries**: this is often not the right conclusion, so treat it as a last resort
- **Weakening assertions**: don't recommend making assertions more lenient or narrowing their scope just to make the test pass (this hides regressions instead of catching them)
- **Reducing coverage surface**: don't recommend stripping tags to skip the test in certain environments (e.g. Cloud) or project types (e.g. serverless Security) unless you have a real reason it shouldn't run there. "It's flaky here" is not a real reason
- **Trusting flaky-test-runner alone**: a green 30/30 or 60/60 run does not prove a fix held. The runner runs tests in isolation, which isn't always the case (Scout test runs share the same test servers for multiple test configs)
- **Assuming "fix the test, not the product"**: always ask first whether the product could be at fault
- **Reporting false certainty**: "I don't know, here are the two plausible explanations and what would distinguish them" is more useful to the owning team than a confident wrong answer.

### Is a fix worth it?

Consider alternatives before recommending a code fix. Once you have a diagnosis, the right next step is not always a code change. Consider:

- **Delete the test.** Do other tests already cover what this one is testing?
- **Refactor or downgrade the test.** See "Pick the right test type" in `docs/extend/scout/best-practices.md`. A functional test can often become an API, component, or Jest unit/integration test.
  - **Caveat:** "migrate this Jest test to RTL" or "convert this to a unit test" is commonly proposed on a flaky-test issue without addressing the underlying flake. Downgrading test type is good hygiene, but the rewrite alone is rarely the fix — the underlying problem (often a missing await or shared state) must also be addressed, or the new test will inherit the flake.
- **Update the tags.** Are the test's tags still appropriate? Should it run on Cloud? Should it be excluded from certain serverless solution types (e.g. Security)?
- **Escalate to the owning team.** If this is a recurring offender or you suspect a product bug, the most useful conclusion may be a writeup handed to the owners, not a fix attempt.

## Reporting

When you report your conclusion, include these details:

1. **What the test does** (one paragraph)
2. **What failed and when** (most recent failure + count of failures over time)
3. **Where it ran** (Cloud or local pipelines, or both)
4. **Root cause hypothesis** (a few sentences describing the outcome of the investigation)
5. **Evidence supporting that hypothesis**, and evidence against it (if you considered alternative hypotheses, include them alongside their confidence level)
6. **Recommended next step** (this won't always be a code change). If you are recommending a code fix, give an honest note on expected durability
7. **Open questions** the investigation could not resolve
