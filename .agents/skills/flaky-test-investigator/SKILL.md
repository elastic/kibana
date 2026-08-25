---
name: flaky-test-investigator
description: Investigate Scout and FTR flaky test failures in Kibana. Use when triaging a failed-test issue, a Buildkite-reported failure, a test path that has been failing intermittently, or any time the user asks to look at a flaky test, deflake a test, or stabilize a test.
disable-model-invocation: true
---

# Flaky Test Investigator

Investigate a flaky Scout or FTR test failure and determine what should be done about it.

- The outcome should be an accurate diagnosis and a robust long-term fix, not a quick fix that treats the symptom.
- Valid outcomes include "this is a real product bug, escalate to the owning team", "this is environmental and will likely self-resolve", or "there isn't enough data to draw a confident conclusion".

## Required input

A link to a GitHub issue with the `failed-test` label is required. If none is provided, ask for one before proceeding.

- The issue may already have prior root-cause analyses or fix proposals posted by automations; take them into account, but always do your own research and reach your own conclusion, since a prior analysis may have been based on less data or on older test-troubleshooting guidance.
- Other comments (including `kibanamachine`'s failure-notification comments) and events in the issue timeline can also help you get the full picture.

## Investigation

### Understand the test environment

- **Is it failing on `kibana-on-merge` (local pipeline), on Cloud pipelines, or both?**
  - _Why it matters:_ tells you whether the test is compatible with Elastic Cloud at all, and whether the failure is more likely environmental (more common on Cloud) or a defect in the test itself (more common when both fail).
  - Recommended: learn more about local versus Elastic Cloud pipelines in `references/pipelines.md`
- **Did it fail in Buildkite builds with many other unrelated test failures?**
  - _Why it matters:_ broad failure across unrelated tests points to an environment or infrastructure problem, not a problem with this test.
- **Understand the test server configuration.** Are Scout tests using the **default** or a **custom** test server configuration? Do FTR tests belong to a test config that defines custom server arguments that aren't supported on e.g., Elastic Cloud?
  - _Why it matters:_ custom server configurations are a common source of flakiness — they diverge from the configurations used by the broader test suite, so issues affecting only them won't surface elsewhere. They also tend to be less actively maintained.
- **For Scout, which lane and neighbors shared servers with the failure?** Scout configs in the same Playwright lane share Kibana/Elasticsearch test servers — state can leak between configs. Map the job's `step_key` (e.g. `scout_test_lane_4`) to its config list by downloading `.scout/test_lane_loads.json` from the build's `Scout Test Run Builder` job (`step_key: build_scout_tests`). The same key is scheduled separately per `<arch>/<server-config>`; the job `name` (e.g. "Scout Lane #4 - stateful-classic / default") disambiguates the physical lane. Parallel configs (`parallel.playwright.config.ts`, `workers > 1`) also have multiple workers competing for the same servers, which can surface as transient timeouts under load.
  - _Why it matters:_ if the same neighbor configs and arch/server-config combo recur across failing builds, suspect lane pollution rather than a test bug. Resource pressure in parallel configs can look test-specific but isn't on its own a reason to drop `workers` to 1.

### Inspect the failure artifacts

Before you go deep on scope or root-cause hypotheses, look at the artifacts the CI run produced. For UI tests in particular, the screenshot at the moment of failure often resolves the diagnosis in under a minute — and skipping this step is a common reason an investigation ends up in the wrong tier of fix.

For every failure, try to retrieve:

- **Screenshot at the failure point.** What is actually on the page? Is the awaited element present but the selector wrong? Is a loading indicator still visible? Is there an error toast or unexpected modal? Is the page blank (app crash) or on a different route than expected?
- **DOM / HTML snapshot at the failure point.** Confirms whether the element the test was looking for actually existed in the DOM (selector issue vs. rendering issue vs. product missing the element entirely).
- **Server logs.** Cross-reference the failure timestamp with any server errors — a 500 or unexpected warning is strong evidence of a product bug, not a test bug. Where these logs live depends on the runner (see **Where the Kibana & Elasticsearch logs live** below), and they are captured at **INFO level and above only**.
- **Full session trace** when the framework supports it (Scout / Playwright). Lets you scrub through every step, locator query, network call, and DOM snapshot.

Things to specifically check in the artifacts before forming a root-cause hypothesis:

- **Did the expected element render at all?** If yes and the selector missed it → flaky selector (Tier 2 fix territory). If no, distinguish **not yet** (a missing test-side wait) from **never** (the awaited state is unreachable — e.g. the component doesn't re-render when its async data arrives): read the component that renders the element, or find trace evidence of it appearing later. A missing wait in the test does not by itself prove the element would eventually have rendered.
- **Is there an error visible in the UI** (toast, banner, console error in the HTML report)? If yes → product side, not test side.
- **Is the page in an unexpected state** (different URL, different user's data, different space)? → cleanup or isolation issue, often points at `afterEach` / `afterAll`.
- **Does the screenshot timestamp match the failure timestamp**? Stale artifacts from a prior step can mislead.

If artifacts are not available (expired, not uploaded, no `read_artifacts` token), say so in the report rather than fabricating a hypothesis. "Screenshot would have resolved this; not available" is a valid open question.

### List and download failure artifacts

`bk artifacts list <build> -p <pipeline> --job-uuid <jobId> --json` returns a JSON listing of every artifact uploaded for the failing job. Pass `--job-uuid <jobId>` for the failed attempt (without it, `bk` only returns the latest attempt and hides retried failures). If a build retried to green, failure artifacts only live on the failed job's listing; don't conclude "no screenshot" until you've scoped to the right job UUID.

Each listing entry carries an artifact ID. `bk artifacts download` has no destination argument — it writes to the current directory — so `cd` into your target dir first and pass `-y` so it doesn't stall on a confirmation prompt: `cd <dest-dir> && bk artifacts download <artifact-id> --build <build> -p <pipeline> -y`. Download only the artifacts you will actually read — the failure screenshot, the DOM/HTML snapshot, the relevant `target/test_failures/*.log` — not the whole listing. For a large text log, `grep`/`sed` around the failure timestamp instead of reading it end to end. Use these commands directly instead of rediscovering the syntax from scratch; only fall back to `bk ... --help` if one doesn't work as documented here.

### Where the Kibana & Elasticsearch logs live

Some runs ship server logs, others don't — and they're **INFO+ only** (no `debug`/`trace`):

| Test type | Kibana logs | Elasticsearch logs |
| --- | --- | --- |
| **FTR** | In the test stdout (`target/test_failures/*.log`, `proc [kibana]` lines) | None |
| **Scout stateful** | `.scout/server.log` | Startup lines only in `.scout/server.log` |
| **Scout serverless** | `.scout/server.log` | None (runs in Docker) |

### Understand the scope

Work through all of these questions:

- **How often is the test failing? Are there time spans when it failed most?** Place the test on the spectrum from "fails very occasionally" (e.g. twice this year) to "fails on every CI run".
  - _Why it matters:_ concentrated failures point to a specific cause tied to that window (a bad commit, an infrastructure incident, a dependency change).
- **When did the test last fail?**
  - _Why it matters:_ if the last failure was 2–3 weeks ago and there are no new comments on the `failed-test` issue, the flakiness may have already resolved itself — intentionally or as a side effect of unrelated changes.
- **Does the test still exist on the branch that's failing?** A test can be deleted or migrated (e.g. FTR → Scout) on `main` while it still runs on a release branch. Identify the branch of the most recent failure and inspect the file there, not on `main`.
  - _Why it matters:_ if the file is gone from `main`, the failure is branch-local — a fix (if any) belongs on the release branch, and reasoning from `main`'s code will be wrong.
  - Don't spend time on tests that no longer exist (the CI build may have not picked up the latest branch changes). Acknowledge the deletion and move on.
- **Are other tests in the same suite or config failing with similar or identical errors?**
  - _Why it matters:_ shared failure modes point to shared building blocks (page objects, fixtures, setup) and usually call for a structural change rather than a per-test patch.
- **Did it fail on a specific version branch?**
  - _Why it matters:_ if the failure isn't happening on `main`, compare the branches to identify what's different. The branch that passes tells you what `main` is missing (or what it added). Perhaps the test was fixed on `main` but the engineer didn't backport the fix to an older version branch.
- **When did it first fail, and when did it last pass?**
  - _Why it matters:_ narrows down the Kibana commit or PR that may have introduced the flakiness.
- **Has this issue or a related one been closed and reopened before?**
  - _Why it matters:_ a reopen is the single strongest signal that the previous diagnosis did not hold. Don't repeat the previous line of reasoning.
- **Is there a chain of fix attempts on this test or test file?** Look for multiple PRs in the last 12 months whose titles mention this test or area (e.g. "address flaky X", "fix flaky X", "another attempt at X").
  - _Why it matters:_ a significant share of "fix" PRs are followed within months by another fix PR on the same area. If you are about to be the third or fourth attempt, the previous shape was almost certainly wrong. Do not repeat it.
- **What did the previous fix change, and what did it claim to address?**
  - _Why it matters:_ if it touched only test code and the test recurred, weigh the product side more heavily this time. If it touched product code and still recurred, the real bug is likely deeper than the previous diff captured.

### Does the test follow best practices?

Check the test against these best practices — the ones flaky tests most often violate. A violation you find is a lead worth investigating, not proof of the root cause:

- **Pick the right test type** (`docs/extend/testing/scout-best-practices#pick-the-right-test-type`): UI tests are notoriously more flaky than component, API, and Jest unit/integration tests — if the behavior can be verified without a browser, test it at that lower level.
- **Prefer APIs for setup and teardown** (`docs/extend/testing/ui-best-practices#prefer-kibana-apis-over-ui-for-setup-and-teardown`): driving setup/teardown through the UI is slower and flakier.
- **Wait for UI updates after actions** (`docs/extend/testing/ui-best-practices#wait-for-ui-updates-when-the-next-action-requires-it`): confirm the action produced the expected result and the UI has rendered before continuing.
- **Wait for complex UI to finish rendering** (`docs/extend/testing/ui-best-practices#wait-for-complex-components-to-fully-render`).
- **Don't use manual retry loops** (`docs/extend/testing/ui-best-practices#dont-use-manual-retry-loops`): if a click or type only works "sometimes", don't re-issue it in a retry — that hides an actionability bug a real user would hit. Fix the interaction or wait on a stable readiness signal instead (see the fix guardrails below).
- **Expect a shared test environment** (`docs/extend/testing/scout-best-practices#expect-a-shared-test-environment`): tests can't assume a clean deployment — other suites leave objects behind, and Cloud ships preinstalled content (Fleet dashboards, prebuilt detection rules, preconfigured connectors). Assertions over lists must tolerate entries the test didn't create: narrow queries to the test's own data, address objects by identity (not position), assert containment (not totality), and never assert that data is absent cluster-wide (empty prompts, "no data" redirects).
- **Don't leak state into the next suite** (`docs/extend/testing/scout-best-practices#dont-leak-state-into-the-next-suite`): whatever a suite creates or changes is still there for the suites that run after it on the same servers. Namespace resource names per run, use a suite-unique time window for fixed-timestamp data, tear down the underlying resource (not just the saved object tracking it), and revert behavior-changing state (settings, feature flags, index templates).

Scout and FTR tests should also follow the general best practices in `docs/extend/testing/scout-best-practices.md`, the UI best practices in `docs/extend/testing/ui-best-practices.md`, and the API best practices in `docs/extend/testing/api-best-practices.md`.

### Fix guardrails

Any fix you recommend must stay within the shared fix guardrails at `.github/workflows/shared/flaky-test-fix-guardrails.md` — the single source of truth for fix anti-patterns, shared with the automated fixer and verifier workflows. Read that file before writing a fix recommendation.

### Investigation pitfalls

Watch out for these pitfalls when investigating the failure:

- **Ignoring the bigger picture**: gather a solid baseline of data about the test environment and related failures (in the same test file, test config or elsewhere) before concluding.
- **Trusting flaky-test-runner alone**: a fully green run does not prove a fix held. The runner runs tests in isolation, which isn't always the case (Scout test runs share the same test servers for multiple test configs). It is also a local pipeline that cannot reproduce a real Elastic Cloud environment (see `references/pipelines.md`) — for a failure that happens on Cloud pipelines, a green flaky-runner result says little about whether the fix holds there.
- **Assuming "fix the test, not the product"**: always ask first whether the product could be at fault. Test-only fixes are meaningfully less durable than fixes that change production code.
- **Reading fault from the throwing stack frame**: a waiting-side timeout always throws from the waiter (FTR/Playwright service code), so the frame tells you who threw, not whose fault it is. It is not evidence against a product bug.
- **Reporting false certainty**: "I don't know, here are the two plausible explanations and what would distinguish them" is more useful to the owning team than a confident wrong answer.

### Is a fix worth it?

Consider alternatives before recommending a code fix. Once you have a diagnosis, the right next step is not always a code change. Consider:

- **Delete the test.** Do other tests already cover what this one is testing?
- **Refactor or downgrade the test.** See "Pick the right test type" in `docs/extend/testing/scout-best-practices.md`. A functional test can often become an API, component, or Jest unit/integration test.
- **Update the tags.** Are the test's tags still appropriate? Should it run on Cloud? Should it be excluded from certain serverless solution types (e.g. Security)?
- **Escalate to the owning team.** If this is a recurring offender or you suspect a product bug, the most useful conclusion may be a writeup handed to the owners, not a fix attempt.

## Reporting

When you report your conclusion, include these details:

1. **What the test does** (one paragraph)
2. **What failed and when** (most recent failure + count of failures over time)
3. **Where it ran** (Cloud or local pipelines, or both)
4. **Root cause hypothesis** (a few sentences describing the outcome of the investigation)
5. **Evidence supporting that hypothesis**, and evidence against it (if you considered alternative hypotheses, include them alongside their confidence level)
6. **Failure screenshot description**: what did you observe in the failure screenshot?
7. **Recommended next step** (this won't always be a code change). If you are recommending a code fix, give an honest note on expected durability
8. **Open questions** the investigation could not resolve
