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
      - [Cloud-friendly pricing model](#cloud-friendly-pricing-model)
      - [Public access](#public-access)
      - [Secrets handling](#secrets-handling)
      - [Support or Documentation](#support-or-documentation)
      - [Container support](#container-support)
    - [Desired](#desired)
      - [Customization](#customization)
      - [Core functionality is first-party](#core-functionality-is-first-party)
      - [First-class support for test results](#first-class-support-for-test-results)
      - [Advanced Pipeline features](#advanced-pipeline-features)
      - [GitHub Integration](#github-integration)
- [Buildkite - Detailed design](#buildkite---detailed-design)
  - [Overview](#overview)
  - [Required and Desired Capabilities](#required-and-desired-capabilities-1)
    - [Required](#required-1)
      - [Scalable](#scalable-1)
      - [Stable](#stable-1)
      - [Surfaces information intuitively](#surfaces-information-intuitively-1)
      - [Pipelines](#pipelines-1)
      - [Cloud-friendly pricing model](#cloud-friendly-pricing-model-1)
      - [Public access](#public-access-1)
      - [Secrets handling](#secrets-handling-1)
      - [Support or Documentation](#support-or-documentation-1)
    - [Desired](#desired-1)
      - [Customization](#customization-1)
      - [Core functionality is first-party](#core-functionality-is-first-party-1)
      - [First-class support for test results](#first-class-support-for-test-results-1)
      - [Advanced Pipeline features](#advanced-pipeline-features-1)
      - [GitHub Integration](#github-integration-1)
  - [Elastic Buildkite Agent Manager](#elastic-buildkite-agent-manager)
  - [Elastic Buildkite PR Bot](#elastic-buildkite-pr-bot)
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

#### Advanced Pipeline features

TODO

- Retries - automatic and manual - full and partial
- Dynamic / Optional dependencies/steps
- Artifacts re-usable between tasks
  - This might just be the ability to dynamically specify a docker image tag for a specific task, built from a previous step

#### GitHub Integration

- Ability to trigger jobs based on webhooks
- Integrate GitHub-specific information into UI, e.g. a build for a PR should link back to the PR

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

TODO check our Buildkite SLA? Can we put that info in here or is it under NDA?

TODO talk about agents, GCP, zones, etc

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

- Pipelines should be defined as code.
- Pipelines should be reasonably easy to understand and change. Kibana team members should be able to follow a simple guide and create new pipelines on their own.
- Changes to pipelines should generally be able to be tested in Pull Requests before being merged.

#### Cloud-friendly pricing model

Buildkite is priced using a per-user model. [TODO what is a user? a committer?] That means that the cost essentially grows with our company size. Most importantly, we don't need to make CI pipeline design decisions based on the Buildkite pricing model.

However, since we manage our own agents, we will still pay for our compute usage, and will need to consider that cost when designing our pipelines.

#### Public access

Buildkite has read-only public access, configurable for each pipeline. An organization can contain a mix of both public and private pipelines.

There are not fine-grained settings for this, and all information in the build is publicly accessible. (TODO: confirm)

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

### Desired

#### Customization

We have very large CI pipelines which generate a lot of information (bundle sizes, performance numbers, etc). Being able to attach this information to builds, so that it lives with the builds in the CI system, is highly desireable. The alternative is building custom reports and UIs outside of the system.

#### Core functionality is first-party

Any core functionality that we depend on should be created and maintained by the organization maintaining the CI software. There is a large amount of risk associated with relying on third-part solutions for too much functionality.

<!-- Functionality can break with updates to the CI system, have security problems that are not addressed, and  -->

#### First-class support for test results

#### Advanced Pipeline features

TODO

- Retries - automatic and manual - full and partial
- Dynamic / Optional dependencies/steps
- Artifacts re-usable between tasks
  - This might just be the ability to dynamically specify a docker image tag for a specific task, built from a previous step

#### GitHub Integration

- Ability to trigger jobs based on webhooks
- Integrate GitHub-specific information into UI, e.g. a build for a PR should link back to the PR

## Elastic Buildkite Agent Manager

TODO

## Elastic Buildkite PR Bot

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
