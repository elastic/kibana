# Cloud and local pipelines

This document provides more information on Kibana's CI testing setup. Tests run either on Elastic Cloud ("Cloud pipeline") or on the machine that triggered the run ("local pipeline", a.k.a. "Kibana CI"). A test that passes locally on the agent's machine may still fail on Cloud. Use the pipeline name to identify where the test ran.

## Elastic Cloud pipelines

- They run Scout and FTR tests only.
- Slugs follow the pattern `appex-qa-{serverless|stateful}-kibana-{ftr|scout}-tests`.
- Each run provisions real Cloud projects or deployments and tests against them.
- Projects and deployments are created in the QA environment via the internal QAF tool, which calls the Elastic Cloud API.
- Cloud runs happen only three times a day because they are expensive.
- **No server configuration overrides are allowed on Cloud.** Projects and deployments are provisioned exactly as a customer would have them — you cannot override YAML settings or pass custom Kibana/Elasticsearch arguments.
- Scout Cloud pipelines run Scout tests tagged `@cloud-*`.

## Local pipelines

- Common examples: `kibana-on-merge`, `kibana-pull-request`, `kibana-flaky-test-suite-runner`. Any non-Cloud pipeline is "local".
- Test servers start on the agent's local machine with no external dependencies, giving a more stable environment.
- Run Scout tests tagged `@local-*`.

## Key differences between Kibana CI and Cloud

A pass on a developer's machine, in Kibana CI, or in the flaky test runner does not guarantee a pass on Cloud. Key differences:

- **Performance:** Cloud has higher latency (especially MKI) and more transient errors, including network errors.
- **Configuration:** Cloud provisions projects and deployments as a customer would. Server configuration cannot be overridden.
- **Security:** the local environment only approximates Cloud's security model. With UIAM enabled, features that rely on API keys may behave differently on Cloud, particularly in serverless.
- **Serverless:** for serverless tests, Kibana CI and the flaky test runner use a local Docker-based simulation, not a real Cloud environment.

Runs can stop unexpectedly due to agent loss. Buildkite retries these automatically.

## How are tests distributed?

In **local** pipelines:

- **Scout** tests are split into "lanes". All Playwright configs in the same lane run against the same test servers, so state can leak between configs.
- **FTR** tests are divided into groups. A fresh set of test servers is started for each config, so cross-config pollution is unlikely.

All **Cloud** pipelines (regardless of test runner type) create a fresh project or deployment per Playwright config.

## Troubleshooting: finding the Kibana commit a Cloud run used

Cloud pipelines do not build Kibana from source — they use a Kibana commit that may lag `main` by several hours. To identify which commit a run used, look for `Build hash:` in the Buildkite logs (e.g. `Build hash: 3927e36048a3a57f0657e06bc224736af8e322f8`):

- **Serverless Cloud projects:** under `Project information`. The log group starts with `Create {security|observability|...} project`.
- **Stateful Cloud deployments:** under `Deployment information`. The log group starts with `Create deployment`.
