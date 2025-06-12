---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/contributing.html
---

# Contributing [contributing]

Whether you want to fix a bug, implement a feature, add an improvement, or add APIs, the following sections will guide you on the process. After committing your code, check out the [Elastic Contributor Program](https://www.elastic.co/community/contributor) where you can earn points and rewards for your contributions.

Read [*Getting started*](/extend/development-getting-started.md) to get your environment up and running, then read [*Best practices*](/extend/development-best-practices.md).

* [Testing](/extend/development-tests.md)
* [How we use Git and GitHub](/extend/development-github.md)
* [Interpreting CI Failures](/extend/interpreting-ci-failures.md)
* [CI Metrics](/extend/ci-metrics.md)
* [Documentation during development](/extend/development-documentation.md)
* [Submitting a pull request](/extend/development-pull-request.md)
* [Effective issue reporting in {{kib}}](/extend/kibana-issue-reporting.md)
* [Signing the contributor license agreement](#signing-contributor-agreement)
* [Localization](#kibana-localization)
* [Release Notes Process](#kibana-release-notes-process)
* [Linting](/extend/kibana-linting.md)


## Signing the contributor license agreement [signing-contributor-agreement]

Please make sure you have signed the [Contributor License Agreement](http://www.elastic.co/contributor-agreement/). We are not asking you to assign copyright to us, but to give us the right to distribute your code without restriction. We ask this of all contributors in order to assure our users of the origin and continuing existence of the code. You only need to sign the CLA once.


## Localization [kibana-localization]

Read [Localization](/extend/development-best-practices.md#kibana-localization-best-practices) for details on our localization practices.

Note that we cannot support accepting contributions to the translations from any source other than the translators we have engaged in doing the work. We are yet to develop a proper process to accept any contributed translations. We certainly appreciate that people care enough about the localization effort to want to help improve the quality. We aim to build out a more comprehensive localization process for the future and will notify you once Kibana supports external contributions. Still, for the time being, we cannot incorporate suggestions.


## Release Notes Process [kibana-release-notes-process]

Part of this process only applies to maintainers, since it requires access to GitHub labels.

{{kib}} publishes [Release Notes](/release-notes/index.md) for major and minor releases. The Release Notes summarize what the PRs accomplish in language that is meaningful to users. To generate the Release Notes, the team runs a script against this repo to collect the merged PRs against the release.


### Create the Release Notes text [_create_the_release_notes_text]

The text that appears in the Release Notes is pulled directly from your PR title, or a single paragraph of text that you specify in the PR description.

To use a single paragraph of text, enter a `Release note:` or `## Release note` header in the PR description ("dev docs" works too), followed by your text. For example, refer to this [PR](https://github.com/elastic/kibana/pull/65796) that uses the `## Release note` header.

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











