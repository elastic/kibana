---
name: flaky-test-investigator
description: >-
  Investigate Scout, FTR and Jest flaky test failures.
---

# Flaky Test Investigator

Investigate a flaky Scout, FTR, or Jest test failure. Start the investigation with any of these inputs:

- A link to the GitHub `failed-test` issue. Given preference to the latest failure, but look at all of them.
- A test file path, plus the branch it failed on (defaults to `main`).
- A Buildkite build URL, plus information to identify the failing test (e.g., test name).

## Prerequisites

More access means a better investigation:

- GitHub API
- Buildkite API
- AppEx QA cluster

TODO: add instructions on access (e.g., environment variables, cluster queries).

## Where did the test fail?

- Tests run either on Elastic Cloud ("Cloud pipeline") or on the machine that triggered the run ("local pipeline" or "Kibana CI").
- A test that passes locally on agent's machine may still fail on Cloud.
- Use the pipeline name to identify where the test ran.

### Elastic Cloud pipelines

- Pipeline slugs follow the pattern `appex-qa-{serverless|stateful}-kibana-{ftr|scout}-tests`.
- Each pipeline provisions real Cloud projects or deployments and tests against them.
- Projects and deployments are created in the QA environment via the internal QAF tool, which calls the Elastic Cloud API.
- Cloud runs happen only three times a day because they are expensive.
- **No server configuration overrides are allowed on Cloud**: projects and deployments are provisioned exactly as a customer would have them. You cannot override YAML settings or pass custom Kibana/Elasticsearch arguments.
- Scout Cloud pipelines run Scout tests tagged with `@cloud-*`

### Local pipelines

- Popular local pipelines: `kibana-on-merge`, `kibana-pull-request` and `kibana-flaky-test-suite-runner`. Generally, any non-Cloud pipeline is "local".
- Test servers start on the agent's local machine, with no external dependencies (leading to a more stable enivornment).
- Run Scout tests tagged with `@local-*`

### Key differences between Kibana CI and Cloud

A pass on the developer's local machine, in Kibana CI, or in the flaky test runner does not guarantee a pass on Cloud. Key differences:

- **Performance**: Cloud has higher latency (especially MKI) and more transient errors, including network errors.
- **Configuration**: Cloud provisions projects and deployments as a customer would. Server configuration cannot be overridden.
- **Security**: the local environment only approximates Cloud's security model. With UIAM enabled, features that rely on API keys may behave differently on Cloud, particularly in serverless.
- **Serverless**: for serverless tests, Kibana CI and the flaky test runner use a local Docker-based simulation, not a real Cloud environment.

In all cases, runs can stop unexpectedly due to agent loss. In these cases they are retried automatically by Buildkite.

### Recognize environment failures

TODO.

## How often is the test failing?

Research:

- Is the test failing consistently?
- Is the test failing on both local and Cloud pipelines?
- When did the test first fail, and when did it last pass?

# Investigation strategies

## Considerations before proceeding with the fix

Important considerations before attempting a fixing or proceeding further with the investigation:

- **Consider deleting the test**: do other tests already cover whatever this test is trying to test?
- **Consider refactoring or downgrading the test**: see "Pick the right test type" in `docs/extend/scout/best-practices.md` (a functional test could be transformed into an API, component or Jest unit integration test)
- **Consider updating the tags**: are the tags assigned to this test appropriate? Will it run on Elastic Cloud? Should we update the tags to exclude Elastic Cloud runs or exclude the test from running in certain serverless solution types (e.g., Security)?

## When did it start failing?

Check the timestamps of the last successful run and the first failure.

Cloud pipelines don't build Kibana from source: they use a Kibana commit that may lag `main` by several hours. Look for `Build hash:` in the Buildkite logs (e.g., `Build hash: 3927e36048a3a57f0657e06bc224736af8e322f8`):

- **Serverless Cloud projects**: under `Project information`. The log group starts with `Create {security|observability|...} project`.
- **Stateful Elastic Cloud deployments**: under `Deployment information`. The log group starts with `Create deployment`.

## On which pipelines did it fail?

Collect Buildkite URLs.

Ideally, query the AppEx QA cluster. If you have access to the cluster, reference `appex-qa-cluster-queries.md`. If you cannot access the cluster, read the comments on the `failed-test` issue to gauge frequency.

## Did it fail because of a polluted test environment?

- **Scout** tests are split in lanes. All Playwright configs in the same lane ran against the same test servers.
- **FTR** tests are divided in groups. Test servers are started for each config.

## Does the test follow best practices?

General best practices that lead to flakiness if not followed:

- **Pick the right test type** (`docs/extend/kibana/scout/best-practices#pick-the-right-test-type`): UI tests are notoriously more flaky than other test categories (component, API, Jest unit and Jest integration tests).
- **Prefer APIs for setup and teardown** (`docs/extend/kibana/scout/ui-best-practices#prefer-kibana-apis-over-ui-for-setup-and-teardown`): e.g., prefer APIs to using UI at all costs (leads to slower and more flaky tests).
- **Wait for UI updates after actions** (`docs/extend/kibana/scout/ui-best-practices#wait-for-ui-updates-when-the-next-action-requires-it`): ensure the action achieved the result it expects. Ensure the UI has rendered before moving on with the test.
- **Wait for complex UI to finish rendering** (`docs/extend/kibana/scout/ui-best-practices#wait-for-complex-components-to-fully-render`)

Scout and FTR tests should follow the general Scout best practices (`docs/extend/scout/best-practices.md`), UI (`docs/extend/scout/ui-best-practices.md`) and API (`docs/extend/scout/api-best-practices.md`) best practices.
