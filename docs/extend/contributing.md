---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/contributing.html
---

# Contributing [contributing]

This guide outlines the contribution process, whether you're fixing a bug, implementing a feature, or adding improvements and APIs. After committing your code, explore the [Elastic Contributor Program](https://www.elastic.co/community/contributor) for points and rewards.

Read [*Getting started*](/extend/development-getting-started.md) to get your environment up and running, then read [*Best practices*](/extend/development-best-practices.md). And don't forget that [Elastic's Open Source Community Code of Conduct](https://www.elastic.co/community/codeofconduct) applies to code contributions too.

* [Testing](/extend/development-tests.md)
* [How we use Git and GitHub](/extend/development-github.md)
* [Interpreting CI Failures](/extend/interpreting-ci-failures.md)
* [CI Metrics](/extend/ci-metrics.md)
* [Documentation during development](docs-content://extend/contribute/index.md)
* [Submitting a pull request](/extend/development-pull-request.md)
* [Effective issue reporting in {{kib}}](/extend/kibana-issue-reporting.md)
* [Signing the contributor license agreement](#signing-contributor-agreement)
* [Localization](#kibana-localization)
* [Release Notes Process](#kibana-release-notes-process)
* [Linting](/extend/kibana-linting.md)


## Signing the contributor license agreement [signing-contributor-agreement]

Sign the [Contributor License Agreement](http://www.elastic.co/contributor-agreement/). This grants us the right to distribute your code without restriction, ensuring its origin and continued availability to users. You only need to sign the CLA once.

### Note on contributing code written with the assistance of AI [_contributing-coe-with-AI]
While any development process is welcome, your PR remains entirely your contribution. By opening a PR, you confirm thorough review, testing, and confidence in your proposed changes.


## Localization [kibana-localization]

For details on our localization practices, refer to the [Localization section](/extend/development-best-practices.md#kibana-localization-best-practices).

We currently only accept translations from our engaged translators, and cannot incorporate external suggestions. We appreciate your interest and aim to develop a process for external contributions in the future.


## Release Notes Process [kibana-release-notes-process]

Part of this process only applies to maintainers, since it requires access to GitHub labels.

{{kib}} publishes [Release Notes](/release-notes/index.md) for major and minor releases. Release Notes summarize merged PRs in user-friendly language. A script generates these notes by collecting merged PRs for each release.


### Create the Release Notes text [_create_the_release_notes_text]

Release Notes text is sourced from your PR title or a single paragraph in the PR description.

To provide a custom paragraph, use a `Release note:` or `## Release note` header in your PR description, followed by the text. (e.g., [this PR](https://github.com/elastic/kibana/pull/65796)).

When you create the Release Notes text, use the following best practices:

* Use active voice.
* Use sentence case.
* When you create a PR that adds a feature, start with `Adds`.
* When you create a PR that improves an existing feature, start with `Improves`.
* When you create a PR that fixes existing functionality, start with `Fixes`.
* When you create a PR that deprecates functionality, start with `Deprecates`.


### Add your labels [_add_your_labels]

To make sure that your PR is included in the Release Notes, add the right label.

1. Label the PR with the targeted version (ex: `v7.3.0`).
2. Label the PR with the appropriate GitHub labels:

    * `release_note:feature` — New user-facing features, significant enhancements to features, and significant bug fixes (in rare cases).
    * `release_note:enhancement` — Minor UI changes and enhancements.
    * `release_note:fix` — Fixes for bugs that existed in the previous release.
    * `release_note:deprecation` — Deprecates functionality that existed in previous releases.
    * `release_note:breaking` — Breaking changes that weren’t present in previous releases.
    * `release_note:skip` — Changes that should not appear in the Release Notes. For example, docs, build, and test fixes, or unreleased issues that are only in `main`.








