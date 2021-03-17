- Start Date: TODO
- RFC PR: (leave this empty)
- Kibana Issue: (leave this empty)

---

- [Summary](#summary)
- [Motivation](#motivation)
  - [Required and Desired Capabilities](#required-and-desired-capabilities)
    - [Required](#required)
      - [Scalable](#scalable)
      - [Stable](#stable)
      - [Surfaces information intuitively](#surfaces-information-intuitively)
      - [Pipelines](#pipelines)
      - [Advanced Pipeline logic](#advanced-pipeline-logic)
      - [Cloud-friendly pricing model](#cloud-friendly-pricing-model)
      - [Public access](#public-access)
      - [Secrets handling](#secrets-handling)
      - [Support or Documentation](#support-or-documentation)
      - [Container support](#container-support)
    - [Desired](#desired)
      - [Customization](#customization)
      - [Core functionality is first-party](#core-functionality-is-first-party)
      - [First-class support for test results](#first-class-support-for-test-results)
      - [GitHub Integration](#github-integration)
      - [Local testing / reproduction?](#local-testing--reproduction)
- [Buildkite - Detailed design](#buildkite---detailed-design)
  - [Overview](#overview)
  - [Required and Desired Capabilities](#required-and-desired-capabilities-1)
    - [Required](#required-1)
      - [Scalable](#scalable-1)
      - [Stable](#stable-1)
      - [Surfaces information intuitively](#surfaces-information-intuitively-1)
      - [Pipelines](#pipelines-1)
      - [Advanced Pipeline logic](#advanced-pipeline-logic-1)
      - [Cloud-friendly pricing model](#cloud-friendly-pricing-model-1)
      - [Public access](#public-access-1)
      - [Secrets handling](#secrets-handling-1)
      - [Support or Documentation](#support-or-documentation-1)
    - [Desired](#desired-1)
      - [Customization](#customization-1)
      - [Core functionality is first-party](#core-functionality-is-first-party-1)
      - [First-class support for test results](#first-class-support-for-test-results-1)
      - [GitHub Integration](#github-integration-1)
  - [What we will build and manage](#what-we-will-build-and-manage)
    - [Elastic Buildkite Agent Manager](#elastic-buildkite-agent-manager)
    - [Elastic Buildkite PR Bot](#elastic-buildkite-pr-bot)
    - [GCP Infrastructure](#gcp-infrastructure)
    - [Monitoring / Alerting](#monitoring--alerting)
    - [Agent Image management](#agent-image-management)
    - [Buildkite org-level settings management](#buildkite-org-level-settings-management)
    - [IT Security Processes](#it-security-processes)
- [Drawbacks](#drawbacks)
- [Alternatives](#alternatives)
  - [Jenkins](#jenkins)
  - [Other solutions](#other-solutions)
    - [CircleCI](#circleci)
    - [GitHub Actions](#github-actions)
- [Adoption strategy](#adoption-strategy)
- [How we teach this](#how-we-teach-this)
- [Unresolved questions](#unresolved-questions)

# Summary

Implement a CI system for Kibana teams that is highly scalable, is stable, surfaces information in an intuitive way, and supports pipelines that are easy to understand and change.

<!-- # Basic example

If the proposal involves a new or changed API, include a basic code example.
Omit this section if it's not applicable. -->

# Motivation

We have lived with the scalability and stability problems of our current Jenkins infrastructure for several years. We have spent a significant amount of time designing around problems, and are limited in how we can design our pipelines. Since the company-wide effort to move to a new system has been cancelled for the forseeable future, we are faced with either re-engineering the way we use Jenkins, or exploring other solutions and potentially managing one ourselves.

This RFC is focused on the option of using a system other than Jenkins, and managing it ourselves (to the extend that it must be managed). If the RFC is rejected, the alternative will be to instead invest significantly into Jenkins to further stablize and scale our usage of it.

## Required and Desired Capabilities

### Required

#### Scalable

- Able to run 100s of pipelines and 1000s of individual steps in parallel without issues.
- If scaling agents/hosts is self-managed, dynamically scaling up and down based on usage should be supported and reasonably easy to do.

#### Stable

- Every minute of downtime can affect 100s of developers.
- For systems provided as a service, they should not have frequent outages. This is a bit hard to define. 1-2 hours of downtime, twice a month, during peak working hours, is extremely disruptive. 10 minutes of downtime once or twice a week can also be very disruptive, as builds might need to be re-triggered, etc.
- For self-hosted solutions, they should be reasonably easy to keep online and have a solution for high-availability. At a minimum, most upgrades should not require waiting for all currently running jobs to finish before deploying.
- Failures are ideally handled gracefully. For example, agents may continue running tasks correctly, once the primary service becomes available again.

#### Surfaces information intuitively

- Developers should be able to easily understand what happened during their builds, and find information related to failures.
- Uer interfaces should be functional and easy to use.
- Overview and details about failures and execution time are particularly important.

#### Pipelines

- Pipelines should be defined as code.
- Pipelines should be reasonably easy to understand and change. Kibana team members should be able to follow a simple guide and create new pipelines on their own.
- Changes to pipelines should generally be able to be tested in Pull Requests before being merged.

#### Advanced Pipeline logic

With such a large codebase and CI pipeline, we often complex requirements around when and how certain tasks should run, and we want the ability to handle this built into the system we use. It can be very difficult and require complex solutions for fairly simple use cases when the system does not support advanced pipeline logic out of the box.

For example, the flaky test suite runner that we currently have in Jenkins is fairly simple: run a given task (which might have a dependency) `N` number of times on `M` agents. This is very difficult to model in a system like TeamCity, which does not have dynamic dependencies.

- Retries
  - Automatic (e.g. run a test suite twice to account for flakiness) and manual (user-initiated)
  - Full (e.g. a whole pipeline) and partial (e.g. a single step)
- Dynamic pipelines
  - Conditional dependencies/steps
    - Based on user input
    - Based on external events/data (e.g. PR label)
    - Based on source code or changes (e.g. only run this for .md changes)
- Metadata and Artifacts re-usable between tasks
  - Metadata could be a docker image tag for a specific task, built from a previous step

#### Cloud-friendly pricing model

If the given system has a cost, the pricing model should be cloud-friendly and/or usage-based.

A per-agent or per-build model based on peak usage in a month is not a good model, because our peak build times are generally short-lived (e.g. around feature freeze).

A model based on build-minutes can also be bad, if it encourages running things in parallel on bigger machines to keep costs down. For example, running two tasks on a single 2-CPU machine with our own orchestration should not be cheaper than running two tasks on two 1-CPU machines using the system's build-in orchestration.

#### Public access

Kibana is a publicly-available repository with contributors from outside Elastic. CI information needs to be available publicly in some form.

#### Secrets handling

Good, first-class support for handling secrets is a must-have for any CI system. This support can take many forms.

- Secrets should not need to be stored in plaintext, in a repo nor on the server.
- For systems provided as a service, it is ideal if secrets are kept mostly/entirely on our infrastructure.
- There should be protections against accidentally leaking secrets to the console.
- There should be programmatic ways to manage secrets.
- Secrets are, by nature, harder to handle. However, the easier the system makes it, the more likely people are to follow best practices.

#### Support or Documentation

For paid systems, both self-hosted and as a service, good support is important. If a problem specific to Elastic is causing us downtime, we expect quick and efficient support. Again, 100s of developers are potentially affected by downtime.

For open source solutions, good documentation is especially important. If much of the operational knowledge of a system can only be gained by working with the system and/or reading the source code, it will be harder to solve problems quickly.

#### Container support

TODO

Required or Desired?

### Desired

#### Customization

We have very large CI pipelines which generate a lot of information (bundle sizes, performance numbers, etc). Being able to attach this information to builds, so that it lives with the builds in the CI system, is highly desireable. The alternative is building custom reports and UIs outside of the system.

#### Core functionality is first-party

Any core functionality that we depend on should be created and maintained by the organization maintaining the CI software. There is a large amount of risk associated with relying on third-part solutions for too much functionality.

<!-- Functionality can break with updates to the CI system, have security problems that are not addressed, and  -->

#### First-class support for test results

#### GitHub Integration

- Ability to trigger jobs based on webhooks
- Integrate GitHub-specific information into UI, e.g. a build for a PR should link back to the PR

#### Local testing / reproduction?

TODO

# Buildkite - Detailed design

For the alternative system in this RFC, we are recommending Buildkite. The UI, API, and documentation have been a joy to work with, they provide most of our desired features and functionality, the team is responsive and knowledgable, and the pricing model does not encourage bad practices to lower cost.

## Overview

[Buildkite](https://buildkite.com/home) is a CI system where the user manages and hosts their own agents, and Buildkite manages and hosts everything else (core services, APIs, UI).

The [Buildkite features](https://buildkite.com/features) page is a great overview of the functionality offered.

For a public instance of Buildkite in action, check out [Bazel's Buildkite](https://buildkite.com/bazel) organization.

## Required and Desired Capabilities

How does Buildkite stack up against our required and desired capabilities?

### Required

#### Scalable

Buildkite claims to support up to 10,000 connected agents "without breaking a sweat."

We were able to connect 2,200 running agents and run a [single job with 1,800 parallel build steps](https://buildkite.com/elastic/kibana-custom/builds/8). The job ran with only about 15 seconds of total overhead (the rest of the time, the repo was being cloned, or the actual tasks were executing). We would likely never define a single job this large, but not only did it execute without any problems, the UI handles it very well.

2,200 agents was the maximum that we were able to test because of quotas on our GCP account that could not easily be increased.

TODO test a large number of parallel jobs as well?

TODO link to agent manager info

#### Stable

So far, we have witnessed no stability issues in our testing.

If Buildkite's status pages are accurate, they seem to be extremely stable, and respond quickly to issues.

- [Buildkite Status](https://www.buildkitestatus.com/)
- [Historical Uptime](https://www.buildkitestatus.com/uptime)
- [Incident History](https://www.buildkitestatus.com/history)

For agents, stability and availability will depend primarily on the infrastructure that we build and the availability of the cloud provider (GCP, primarily) running our agents. Since we control our agents, we will be able to run agents across multiple zones, and possibly regions, in GCP for increased availability. See [TODO agent manager section].

They have a [99.95% uptime SLA](https://buildkite.com/enterprise) for Enterprise customers.

TODO how does Buildkite handle failures? What happens to jobs? Even if poorly, downtime seems to be very rare

#### Surfaces information intuitively

The Buildkite UI is very easy to use, and works as expected. Here is some of the information surfaced for each build:

- The overall status of the job, as well as which steps succeeded and failed.
- Logs for each individual step
- The timeline for each individual step, including how long it took Buildkite to schedule/handle the job on their end
- Artifacts uploaded by each step
- The entire agent/job configuration at the time the step executed, expressed as environment variables

TODO how are complex pipelines (dependencies) handled in the UI?

TODO screenshots? links?

TODO link to customization section once complete - we can surface any extra information we want

#### Pipelines

- [Buildkite piplines](https://buildkite.com/docs/pipelines) must be defined as code. Even if you configure them through the UI, you still have to do so using yaml.
- This is subjective, but the yaml syntax for pipelines is friendly and straightforward. We feel that it will be easy for teams to create and modify pipelines with minimal instructions.
- If your pipeline is configured to use yaml stored in your repo for its definition, branches and PRs will use the version in their source by default. This means that PRs that change the pipeline can be tested as part of the PR CI.
- Top-level pipeline configurations, i.e. basically a pointer to a repo that has the real pipeline yaml in it, can be configured via the UI, API, or terraform.

#### Advanced Pipeline logic

Buildkite supports very advanced pipeline logic, and has support for generating dynamic pipeline definitions at runtime.

- [Conditionals](https://buildkite.com/docs/pipelines/conditionals)
- [Dependencies](https://buildkite.com/docs/pipelines/dependencies) with lots of options, including being optional/conditional
- [Retries](https://buildkite.com/docs/pipelines/command-step#retry-attributes), both automatic and manual, including configuring retry conditions by different exit codes
- [Dynamic pipelines](https://buildkite.com/docs/pipelines/defining-steps#dynamic-pipelines) - pipelines can be generated by running a script at runtime
- [Metadata](https://buildkite.com/docs/pipelines/build-meta-data) can be set in one step, and read in other steps
- [Artifacts](https://buildkite.com/docs/pipelines/artifacts) can be uploaded from and downloaded in steps, and are visible in the UI
- [Parallelism and Concurrency](https://buildkite.com/docs/tutorials/parallel-builds) settings

See [here](https://github.com/elastic/kibana/blob/2c1cd95b6028e9fd1f75a59eb7ff76c84667faf8/.buildkite/flaky-test-suite-runner.yml) and [here](https://github.com/elastic/kibana/blob/2c1cd95b6028e9fd1f75a59eb7ff76c84667faf8/.buildkite/scripts/flaky-test-suite-runner.sh) for an example of a dynamically-generated pipeline based on user input that runs a job `RUN_COUNT` times (from user input), across up to a maximum of 25 agents at once.

#### Cloud-friendly pricing model

Buildkite is priced using a per-user model, where a user is effectively an Elastic employee triggering builds for Kibana via PR, merging code, or through the Buildkite UI. That means that the cost essentially grows with our company size. Most importantly, we don't need to make CI pipeline design decisions based on the Buildkite pricing model.

However, since we manage our own agents, we will still pay for our compute usage, and will need to consider that cost when designing our pipelines.

#### Public access

Buildkite has read-only public access, configurable for each pipeline. An organization can contain a mix of both public and private pipelines.

There are not fine-grained settings for this, and all information in the build is publicly accessible. (TODO: confirm)

#### Secrets handling

[Managing Pipeline Secrets](https://buildkite.com/docs/pipelines/secrets)

Buildkite doesn't really have a concept of secrets. This is primarily because agents run on customers' infrastructure, so secrets can stay completely in the customer's environment. They provide recommendations for accessing secrets in pipelines in secure ways.

There are two recommended methods for handling secrets: using a third-party secrets service like Vault or GCP's Secret Manager, or baking them into agent images and only letting certain jobs access them. Since Elastic already uses Vault, we could utilize Vault the same way we do in Jenkins today.

However, since Buildkite doesn't really have a concept of secrets, it's up to us to ensure secrets are not leaked to the console. Note that this is similar to our pipelines today: secrets we pull out of Vault at runtime are not automatically masked in the console.

#### Support or Documentation

[Buildkite's documentation](https://buildkite.com/docs/pipelines) is extensive and well-written, as mentioned earlier.

Besides this, [Enterprise](https://buildkite.com/enterprise) customers get 24/7 emergency help, prioritized support, a dedicated chat channel, and guaranteed response times. They will also consult on best practices, etc.

### Desired

#### Customization

We have very large CI pipelines which generate a lot of information (bundle sizes, performance numbers, etc). Being able to attach this information to builds, so that it lives with the builds in the CI system, is highly desireable. The alternative is building custom reports and UIs outside of the system.

TODO annotations

TODO mention log output customization https://buildkite.com/docs/pipelines/managing-log-output

#### Core functionality is first-party

Any core functionality that we depend on should be created and maintained by the organization maintaining the CI software. There is a large amount of risk associated with relying on third-part solutions for too much functionality.

<!-- Functionality can break with updates to the CI system, have security problems that are not addressed, and  -->

#### First-class support for test results

#### GitHub Integration

- Ability to trigger jobs based on webhooks
- Integrate GitHub-specific information into UI, e.g. a build for a PR should link back to the PR

## What we will build and manage

### Elastic Buildkite Agent Manager

TODO

### Elastic Buildkite PR Bot

TODO

### GCP Infrastructure

TODO

Hosting for bots/services, GCS buckets, images, networking (cloud nat), IAM/permissions

Terraform

### Monitoring / Alerting

TODO

GCP monitoring (instances, quotas, etc)

Buildkite monitoring (agent queues, job times)

### Agent Image management

### Buildkite org-level settings management

TODO

Mostly/all terraform

Any settings not stored in pipeline yaml

Top-level pipelines and their settings

Users/roles

SSO

### IT Security Processes

TODO

# Drawbacks

Why should we _not_ do this? Please consider:

- implementation cost, both in term of code size and complexity
- the impact on teaching people Kibana development
- integration of this feature with other existing and planned features
- cost of migrating existing Kibana plugins (is it a breaking change?)

There are tradeoffs to choosing any path. Attempt to identify them here.

# Alternatives

## Jenkins

TODO how Jenkins stacks up against the required/desired functionality, and the kinds of things we would need to build to get there.

## Other solutions

### CircleCI

### GitHub Actions

# Adoption strategy

If we implement this proposal, how will existing Kibana developers adopt it? Is
this a breaking change? Can we write a codemod? Should we coordinate with
other projects or libraries?

# How we teach this

What names and terminology work best for these concepts and why? How is this
idea best presented? As a continuation of existing Kibana patterns?

Would the acceptance of this proposal mean the Kibana documentation must be
re-organized or altered? Does it change how Kibana is taught to new developers
at any level?

How should this feature be taught to existing Kibana developers?

# Unresolved questions

Optional, but suggested for first drafts. What parts of the design are still
TBD?
