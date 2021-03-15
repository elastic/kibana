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
    - [Desired](#desired)
      - [Customization](#customization)
      - [Core functionality is first-party](#core-functionality-is-first-party)
      - [First-class support for test results](#first-class-support-for-test-results)
      - [Advanced Pipeline features](#advanced-pipeline-features)
- [Detailed design](#detailed-design)
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
- For self-hosted solutions, they should be reasonably easy to keep online and have a solution for high-availability.

#### Surfaces information intuitively

- Developers should be able to easily understand what happened during their builds, and find information related to failures.
- Uer interfaces should be functional and easy to use.

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

### Desired

#### Customization

We have very large CI pipelines which generate a lot of information (bundle sizes, performance numbers, etc). Being able to attach this information to builds, so that it lives with the builds in the CI system, is highly desireable. The alternative is building custom reports and UIs outside of the system.

#### Core functionality is first-party

Any core functionality that we depend on should be created and maintained by the organization maintaining the CI software. There is a large amount of risk associated with relying on third-part solutions for too much functionality.

<!-- Functionality can break with updates to the CI system, have security problems that are not addressed, and  -->

#### First-class support for test results

#### Advanced Pipeline features

- Retries
- Dynamic / Optional dependencies/steps

# Detailed design

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
