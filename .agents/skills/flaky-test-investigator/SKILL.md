---
name: flaky-test-investigator
description: >-
  Key pointers to investigate flaky test failures.
---

# Flaky Test Investigator

This Investigate flaky test failures.

## Where did the test fail?

A test run can run on Elastic Cloud ("cloud pipeline") or the machine that invokes the test run ("local pipeline", or Kibana CI). Tests that pass locally may fail or behave differently on Elastic Cloud.

### Elastic Cloud pipelines

- The pipeline slug name follows this name pattern: `appex-qa-{serverless|stateful}-kibana-{ftr|scout}-tests`
- Each pipeline provisions real Cloud projects or deployments and runs tests against them.
- Projects and deployments are created in the QA environment using the internal automation tool QAF which sends a creation request to the Elastic Cloud API.
- Cloud test runs only run a few times per day because they are expensive.
- IMPORTANT: no server configuration overrides are allowed on Cloud. Cloud pipelines create projects and deployments exactly as a customer would. It is not possible to override server configuration (YAML settings, custom Kibana or Elasticsearch server arguments).

### Local pipelines

- For example: `kibana-on-merge` and `kibana-pull-request`. Generally all non-Cloud pipelines are "local" pipelines.
- Test servers are started on the agent's local machine. No communication with the outside world, thus a relatively more stable environment.

### Kibana CI and Elastic Cloud pipelines differences

A test passing on your local machine, in the Kibana CI, or in the flaky test runner does not guarantee it will pass on Cloud. These environments differ in important ways.

Key differences include:

- Performance: Cloud has higher latency (especially MKI) and is more susceptible to transient errors, including network errors.
- Configuration: Cloud projects and deployments are provisioned exactly as a customer would provision them. Server configuration cannot be overridden.
- Security: the local simulation approximates Cloud's security model. With UIAM enabled, features relying on API keys may behave differently on Cloud, particularly in serverless.
- Serverless: when running serverless tests, Kibana CI pipelines and the flaky test runner use a local serverless simulation backed by Docker images, not a real Cloud environment.

In all cases, test runs may be stopped unexpectendly because of agent loss.

### Recognize the pipeline the test failed on

Use either the pipeline name or look at the test's "target": `local-stateful-classic` means the test ran locally (because it starts with `local-*`, on an Elastic Cloud pipeline otherwise as it starts with `cloud-*`).

### Recognize environment failures

TODO. Details coming soon.

In GitHub `failed-test` issues: either check pipeline name or use the test's **target** (e.g. `local-stateful-classic`, `cloud-serverless-security_complete`) to understand in which environment the test has run (`local-*` or `cloud-*`).

## How often did it fail?

Look at the ...

## When did it start failing?

Look at the commit.
