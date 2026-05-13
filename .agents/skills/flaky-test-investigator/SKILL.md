---
name: flaky-test-investigator
description: >-
  Investigate Scout, FTR, and Jest flaky test failures.
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

TODO: add access instructions (environment variables, cluster queries).

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

## When did it start failing?

Compare the timestamps of the last successful run and the first failure. For Cloud runs, look up the Kibana commit each one used (see "Finding the Kibana commit a Cloud run used" in Background) so you can pinpoint which commit introduced the regression.

## On which pipelines did it fail?

For each Buildkite URL the test failed in:

- Understand the pipeline type (Cloud or local)
- Understand the test server configuration (for Scout and Jest tests, are the tests using **default** or **custom test servers** configuration?)
  - Tip: reference `docs/extend/scout/feature-flags.md#custom-server-configs-reach-out-to-appex-qa-first-scout-feature-flags-custom-servers` for more information on custom servers configs in Scout.

Ideally, query the AppEx QA cluster — see `appex-qa-cluster-queries.md`. Otherwise, read the comments on the `failed-test` issue to gauge frequency.

## Did the environment cause the failure?

Signs the environment is at fault rather than the test itself:

- **The build had many unrelated failures**: a broad pattern of failures across unrelated tests in the same build points to an infrastructure issue (agent problems, network, downstream service outage).
- **The test was polluted by another test**: most likely for Scout tests sharing a lane (see "How tests are distributed across servers"). Look at which other tests ran against the same servers in the failing build. Check if the failing builds often share the same config run order pattern.
- **The failure screenshot** could sometimes help. Example: it shows a loading Kibana logo, typically indicating that Kibana isn't completely operational.

## Recognize environment failures

TODO.

# Investigation: assess the test itself

Once you understand the failure pattern, evaluate whether the test is worth fixing as-is.

## Consider alternatives before fixing

Before attempting a fix, consider:

- **Delete the test.** Do other tests already cover what this one is testing?
- **Refactor or downgrade the test.** See "Pick the right test type" in `docs/extend/scout/best-practices.md`. A functional test can often become an API, component, or Jest unit/integration test.
- **Update the tags.** Are the test's tags still appropriate? Should it run on Cloud? Should it be excluded from certain serverless solution types (e.g. Security)?

## Does the test follow best practices?

Common best-practice violations that cause flakiness:

- **Pick the right test type** (`docs/extend/kibana/scout/best-practices#pick-the-right-test-type`). UI tests are notoriously more flaky than component, API, and Jest unit/integration tests.
- **Prefer APIs for setup and teardown** (`docs/extend/kibana/scout/ui-best-practices#prefer-kibana-apis-over-ui-for-setup-and-teardown`). Driving setup/teardown through the UI is slower and flakier.
- **Wait for UI updates after actions** (`docs/extend/kibana/scout/ui-best-practices#wait-for-ui-updates-when-the-next-action-requires-it`). Confirm the action produced the expected result and the UI has rendered before continuing.
- **Wait for complex UI to finish rendering** (`docs/extend/kibana/scout/ui-best-practices#wait-for-complex-components-to-fully-render`).

Scout and FTR tests should also follow the general best practices in `docs/extend/scout/best-practices.md`, the UI best practices in `docs/extend/scout/ui-best-practices.md`, and the API best practices in `docs/extend/scout/api-best-practices.md`.

# Investigation pitfalls

Common bad instincts when fixing a flaky test. Each of these can make the symptom go away while leaving the underlying problem — or worse, hiding a real bug.

- **Ignoring the bigger picture.** Don't fix in isolation. The flakiness may have been transient, may point to a broader environment issue, or may be a signal that the test should be rewritten or removed (see "Investigation: assess the test itself").
- **Raising timeouts or retry counts.** Rarely the right fix. Treat it as a last resort and exhaust other options first.
- **Weakening assertions.** Don't make assertions more lenient or narrow their scope just to make the test pass; that hides regressions instead of catching them.
- **Reducing coverage surface.** Don't strip tags to skip the test in certain environments (e.g. Cloud) or project types (e.g. serverless Security) unless you have a real reason it shouldn't run there. "It's flaky here" is not a real reason.
