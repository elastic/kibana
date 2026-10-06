---
name: changelog-entry
description: Write or review the release-note content for a Kibana pull request. Use when preparing or reviewing a PR that has a release_note:feature, release_note:enhancement, release_note:fix, release_note:breaking, or release_note:deprecation label, when a PR body has or needs a "## Release note" section, when the PR adds or edits docs/changelog/<pr-number>.yaml, or when the PR touches generated release-note files under docs/release-notes/, docs/releases/, or docs/CHANGELOG.asciidoc. Produces or checks the PR body section and the changelog YAML against Elastic changelog standards and Kibana's docs/changelog.yml configuration.
---

# Changelog entry

Release notes for Kibana and serverless are generated from two inputs the PR author controls: the labels and `## Release note` section on the PR, and a `docs/changelog/<pr-number>.yaml` file in the PR. Write both as the final text users will read.

## When to stop

- The PR has `release_note:skip`, or the change is internal, test-only, docs-only, or a fix for a feature that has not shipped. Say so and produce nothing.
- The PR is a backport (base branch other than `main`, `[9.5]`-style title prefix, or `backport` label when labels are visible). The entry lives on the original PR.

## Inputs

Read, in this order: PR title, labels, body, linked issues, and the changed files. Locally, `gh pr view <n> --json title,labels,body,files` and `gh pr diff <n>` supply these; otherwise use what you are given. Then read `docs/changelog.yml` for the current label-to-type, label-to-area, and label-to-product mappings under `pivot`. Do not guess values that file defines.

In automated review (Libra) you receive the PR title, body, base branch, changed-file list, and diff, and you can `read_file` at the PR head. You do not receive labels and cannot run commands. Skip every check below that needs a label, and treat the `## Release note` section of the body as the author's statement of what the release note should say.

## Labels (check first)

Every release-noted PR needs all three. Report any that are missing or wrong; do not add labels yourself unless asked.

- Exactly one `release_note:*` label: `feature` (new capability), `enhancement` (improvement to an existing one), `fix` (bug in a released version), `breaking` (existing behavior stops working), `deprecation` (still works, removal planned). `skip` for everything else.
- Version labels for the exact patch releases the change ships in (`v9.6.0`, `v9.5.5`), one per minor. A label for an already released version means the entry is never collected; `git tag --list 'v9.5.*'` shows what has shipped.
- A team or feature label (`Team:Fleet`, `Feature:Discover`). `pivot.areas` and `pivot.products` in `docs/changelog.yml` map these to release-note sections and solution release notes.

## PR body: `## Release note`

Add or rewrite a `## Release note` section in the PR body. It becomes the entry `description`.

- Third-person present, verb first: "Adds", "Fixes", "Removes", "Improves". Not "Added", not "This PR adds", not passive.
- Say what the user can now do or what no longer goes wrong. Name the feature area in the sentence ("in Lens", "for APM traces", "in the Fleet agent policy API").
- Address the reader as "you". Never "users" or "customers".
- One sentence for a fix or small enhancement. One short paragraph at most for a feature or breaking change.
- No internal names: plugin IDs, saved object types, task names, flag names, team names, ticket numbers. Use the names shown in the product or public docs.
- Backticks for API paths, settings, field names, and literal values. `{{esql}}`, `{{kib}}`, `{{serverless-full}}` for product names when the surrounding text uses docs variables; plain names otherwise.
- Breaking change or deprecation: also say what breaks and what the user must do. Those become `impact` and `action`.

## The YAML file

Create `docs/changelog/<pr-number>.yaml` in the PR. Fields, in this order:

```yaml
prs:
- https://github.com/elastic/kibana/pull/<pr-number>
issues:                                   # omit if none
- https://github.com/elastic/kibana/issues/<n>
type: bug-fix                             # from the release_note label via docs/changelog.yml
subtype: api                              # breaking-change only; see docs/changelog.yml
products:
- product: kibana
- product: cloud-serverless               # include only the products the change reaches
areas:
- Alerting and reporting                  # exact strings from the areas pivot in docs/changelog.yml
title: Fix dashboard filters not applying to embedded visualizations
description: Fixes an issue where dashboard filters were not applied to embedded visualizations.
impact: ...                               # breaking-change and deprecation only
action: ...                               # breaking-change and deprecation only
```

Rules:

- `type` comes from the label mapping: `release_note:fix` is `bug-fix`, `release_note:breaking` is `breaking-change`, `release_note:feature` is `feature`, `release_note:enhancement` is `enhancement`, `release_note:deprecation` is `deprecation`.
- `title`: imperative base form ("Fix", "Add", "Remove"), sentence case, under 80 characters, no trailing period, no `[Team]` prefix. The title is what appears in the bulleted list; it must stand alone.
- `description`: third-person present ("Fixes", "Adds"), under 600 characters, adds something the title does not. Omit it when it would only restate the title.
- `title` and `type` must agree. A `bug-fix` whose title starts with "Add" or an `enhancement` whose title starts with "Fix" is wrong; fix the type or the title.
- `products`: list `kibana` and `cloud-serverless` unless the change cannot reach one of them (a stateful-only setting, a serverless-only project type). Add `observability` or `security` only when a label on the PR maps to it under `pivot.products` in `docs/changelog.yml`.
- `areas`: exact values from `pivot.areas` in `docs/changelog.yml`, chosen by the PR's labels. Omit the field when no label maps to an area; do not pick `Other` or invent a name.
- `impact` and `action` for `breaking-change` and `deprecation`: `impact` says who is affected and how; `action` says the concrete step to take, with the replacement API, setting, or workflow named.
- Quote any YAML scalar that contains `:`, `#`, or starts with a special character.

## Before finishing

Check your own output against these and fix it:

1. Would a user who has not read the PR know what changed and why they care, from the title alone?
2. Does the description name a user-visible behavior rather than an implementation (component, hook, index, task)?
3. Do `type`, `title` verb, and description verb agree?
4. Are all `areas` and `products` values present in `docs/changelog.yml`?
5. Is anything in the text an internal name a serverless user could not see?

## Reviewing a PR

Apply the same rules to what the author wrote. Anchor every finding to a changed line in a changed file and name the rule you applied; do not print a report.

Generated files first. `docs/release-notes/**`, `docs/releases/**`, and `docs/CHANGELOG.asciidoc` are built from the changelog entries by the docs team's tooling. A PR that edits them by hand loses the edit at the next build. Report it on the changed lines and point the author to `docs/changelog/<pr-number>.yaml` and the `## Release note` section instead.

When the diff contains `docs/changelog/*.yaml`, read `docs/changelog.yml` at the PR head, then check the entry line by line:

- File name is `<pr-number>.yaml` for this PR, and `prs` contains this PR's URL.
- `type` is one of the values under `pivot.types` in `docs/changelog.yml`, and it agrees with the `title` verb and with the `## Release note` text in the body. "Fix ..." with `type: feature`, or a body that describes a new capability with `type: bug-fix`, is a finding on the `type` line.
- `title`: imperative base form, sentence case, under 80 characters, no trailing period, no `[Team]` or `[Feature]` prefix, and understandable without the PR.
- `description`: third-person present, under 600 characters, adds something the title does not. If it only restates the title, say to drop it. If it contradicts the `## Release note` section in the body, report the mismatch and quote both.
- Every `areas` value is an exact string under `pivot.areas`; every `products[].product` is `kibana`, `cloud-serverless`, or a value under `pivot.products`. Report an unknown value with the nearest valid one.
- `breaking-change` and `deprecation` entries have `impact` and `action`, and `action` names the replacement.
- No internal names anywhere in `title`, `description`, `impact`, or `action`.
- Scalars containing `:` or `#` are quoted.

When the body has a release-note section (any heading level, "Release note" or "Release notes") with real release-note text (not "N/A", "skip", or the empty template) and the changed-file list has no `docs/changelog/*.yaml`, report that the entry is missing. Anchor it to the first changed line of the source file that implements the change the note describes, and include a ready-to-paste `docs/changelog/<pr-number>.yaml` built from the body. Do not report a missing entry when the body has no release note; you cannot see whether `release_note:skip` is applied.

Review the `## Release note` text itself only when the PR also changes a changelog file or a generated release-note file, and anchor that finding to the changelog `description` line. A body-only problem has no changed line to attach to.

Reference: [Changelogs content type](https://www.elastic.co/docs/contribute-docs/content-types/changelogs) for the schema, [Elastic style guide](https://www.elastic.co/docs/contribute-docs/style-guide) for wording.
