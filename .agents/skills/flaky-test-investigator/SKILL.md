---
name: flaky-test-investigator
description: >-
  Investigate Scout, FTR, and Jest flaky test failures.
---

# Flaky Test Investigator

Investigate a flaky Scout, FTR, or Jest test failure. Start from any of these inputs:

- A link to the GitHub `failed-test` issue. Prefer the latest failure, but review all of them.
- A test file path, plus the branch it failed on (defaults to `main`).
- A Buildkite build URL, plus enough information to identify the failing test (e.g. test name).

## Prerequisites

More access means a better investigation:

- GitHub API
- Buildkite API
- AppEx QA cluster

TODO: add access instructions (environment variables, cluster queries).

## Where did the test fail?

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

In all cases, runs can stop unexpectedly due to agent loss. Buildkite retries these automatically.

### Recognize environment failures

TODO.

## Recognize the failure

- Environment issue
- Polluted test environment

### Polluted test environment

Explain what "lanes" distribution mode is...

Some tests... look at the BK logs...

# Investigation strategies

## Before proposing a fix, consider alternatives

Before attempting a fix or digging deeper, consider:

- **Delete the test.** Do other tests already cover what this one is testing?
- **Refactor or downgrade the test.** See "Pick the right test type" in `docs/extend/scout/best-practices.md`. A functional test can often become an API, component, or Jest unit/integration test.
- **Update the tags.** Are the test's tags still appropriate? Should it run on Cloud? Should it be excluded from certain serverless solution types (e.g. Security)?

## How often is the test failing?

Answer:

- Is it failing consistently?
- Is it failing on both local and Cloud pipelines?
- When did it first fail, and when did it last pass?

## When did it start failing?

Check the timestamps of the last successful run and the first failure.

Cloud pipelines do not build Kibana from source — they use a Kibana commit that may lag `main` by several hours. Look for `Build hash:` in the Buildkite logs (e.g. `Build hash: 3927e36048a3a57f0657e06bc224736af8e322f8`):

- **Serverless Cloud projects:** under `Project information`. The log group starts with `Create {security|observability|...} project`.
- **Stateful Cloud deployments:** under `Deployment information`. The log group starts with `Create deployment`.

## On which pipelines did it fail?

Collect Buildkite URLs.

Ideally, query the AppEx QA cluster — see `appex-qa-cluster-queries.md`. If you cannot access the cluster, read the comments on the `failed-test` issue to gauge frequency.

## Did it fail because of a polluted test environment?

- **Scout** tests are split into lanes. All Playwright configs in the same lane run against the same test servers.
- **FTR** tests are divided into groups. A fresh set of test servers is started for each config.
