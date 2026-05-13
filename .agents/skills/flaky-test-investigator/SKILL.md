---
name: flaky-test-investigator
description: >-
  Investigate Scout, FTR and Jest flaky test failures.
---

# Flaky Test Investigator

Runs a flaky test investigation for Scout, FTR and Jest flaky test failures. Multiple ways to start the investigation:

- Pass a link to the GitHub `failed-test` GitHub issue.
- Pass the test file string, branch it failed on (default is `main`)
- Pass a Buidkite build URL

## Pre-requisites

The more access you have the better:

- GitHub API
- Buildkite logs access
- AppEx QA cluster

## Where did the test fail?

A test run can run on Elastic Cloud ("cloud pipeline") or the machine that invokes the test run ("local pipeline", or Kibana CI). Tests that pass locally may fail or behave differently on Elastic Cloud.

### Elastic Cloud pipelines

- The pipeline slug name follows this name pattern: `appex-qa-{serverless|stateful}-kibana-{ftr|scout}-tests`
- Each pipeline provisions real Cloud projects or deployments and runs tests against them.
- Projects and deployments are created in the QA environment using the internal automation tool QAF which sends a creation request to the Elastic Cloud API.
- Cloud test runs only run a few times per day because they are expensive.
- IMPORTANT: no server configuration overrides are allowed on Cloud. Cloud pipelines create projects and deployments exactly as a customer would. It is not possible to override server configuration (YAML settings, custom Kibana or Elasticsearch server arguments).

### Local pipelines

- For example: `kibana-on-merge`, `kibana-pull-request` and `kibana-flaky-test-suite-runner`. Generally all non-Cloud pipelines are "local" pipelines.
- Test servers are started on the agent's local machine. No communication with the outside world, thus a relatively more stable environment.

### Kibana CI and Elastic Cloud pipelines differences

A test passing on your local machine, in the Kibana CI, or in the flaky test runner does not guarantee it will pass on Cloud. Key environment differences:

- Performance: Cloud has higher latency (especially MKI) and is more susceptible to transient errors, including network errors.
- Configuration: Cloud projects and deployments are provisioned exactly as a customer would provision them. Server configuration cannot be overridden.
- Security: the local simulation approximates Cloud's security model. With UIAM enabled, features relying on API keys may behave differently on Cloud, particularly in serverless.
- Serverless: when running serverless tests, Kibana CI pipelines and the flaky test runner use a local serverless simulation backed by Docker images, not a real Cloud environment.

In all cases, test runs may be stopped unexpectendly because of agent loss.

### Recognize the pipeline the test failed on

Use either the pipeline name or look at the test's "target": `local-stateful-classic` means the test ran locally (because it starts with `local-*`, on an Elastic Cloud pipeline otherwise as it starts with `cloud-*`, e.g., `cloud-serverless-security_complete`).

### Recognize environment failures

TODO.

## How often is the test failing

Answer these questions:

- Is the test failing consistently?
- Is the test failing on both local and Cloud pipelines?
- When did the test first fail and when did the test last succeed?

Cloud pipelines don't build from source: they use a Kibana commit that isn't aligned with `main` and could be some hours old. Look for `Build hash: <Kibana commit>` (example: `Build hash: 3927e36048a3a57f0657e06bc224736af8e322f8`):

- Serverless Elastic Cloud projects: under `Project information`. The log group will start with `Create {security|observability|...} project`.
- Stateful Elastic Cloud deployments: .under `Deployment information` The log group usually starts with `Create deployment`

Ideally, you should query the AppEx QA cluster to understand. The following query will help:

```

```

If access to the cluster isn't available: look at the comments on `failed` to understand which

## When did it start failing?

Look at the timestamp of the last successful test run and the first.

For Cloud pipelines:

Look at the commit in the BK logs. ...

## Recognize the failure

- Environment issue
- Polluted test environment

### Polluted test environment

Explain what "lanes" distribution mode is...

Some tests... look at the BK logs...
