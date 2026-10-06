---
name: changelog-entry
description: Write or review release-note content for Kibana. For PR authors, shapes the PR title, release_note:* label, and "## Release note" body section that the docs team's tooling turns into a changelog entry after merge. For reviewers, checks docs/changelog/<pr-number>.yaml entries and docs/releases/ bundles when a PR changes them. Use when a PR has a release_note:feature, release_note:enhancement, release_note:fix, release_note:breaking, or release_note:deprecation label, when a PR body has or needs a "## Release note" section, or when a PR touches docs/changelog/ or docs/releases/. Applies the Elastic changelog standards (docs-fix-changelog and docs-review-changelog in elastic/elastic-docs-skills) and Kibana's docs/changelog.yml configuration.
metadata:
  source: https://github.com/elastic/elastic-docs-skills/tree/main/skills/changelogs/docs-fix-changelog
  source_version: "2.6.3"
---

# Changelog entry

Release notes for Kibana and serverless are generated after merge. At release time the docs team runs `docs-builder` over the merged PRs: the `release_note:*` label becomes the entry `type`, the PR title (with any `[Team]` prefix stripped) becomes the entry `title`, and the `## Release note` section of the PR body becomes the `description`. The result is `docs/changelog/<pr-number>.yaml`, bundled into `docs/releases/`. PR authors do not add that file; they control the three inputs. Write the PR title and `## Release note` section as the final text users will read, because that is what they become.

Accuracy over style. Never trade a correct statement for a better-sounding one. When the PR does not tell you what the user sees, ask; do not infer a symptom.

## When to stop

- The PR has `release_note:skip`, or the change is test-only, refactor-only, docs-only, internal plumbing, or a fix for a feature that has not shipped. Say so and produce nothing. If a changelog entry already exists for such a PR, recommend deleting it rather than polishing it.
- The PR is a backport (base branch other than `main`, `[9.5]`-style title prefix, or `backport` label when labels are visible). The release note lives on the original PR.

## Inputs

Read, in this order: PR title, labels, body, linked issues, and the changed files. Locally, `gh pr view <n> --json title,labels,body,files` and `gh pr diff <n>` supply these; otherwise use what you are given. Linked issues matter: an issue title usually states the user-visible symptom better than the PR title does. Then read `docs/changelog.yml` for the current label-to-type, label-to-area, and label-to-product mappings under `pivot`. Do not guess values that file defines.

If the PR title contains an acronym or internal shorthand you cannot resolve from the body or diff, ask what it stands for. Do not guess an expansion.

In automated review (Libra) you receive the PR title, body, base branch, changed-file list, and diff, and you can `read_file` at the PR head. You do not receive labels and cannot run commands. Skip every check below that needs a label.

## Labels (check first)

Every release-noted PR needs all three. Report any that are missing or wrong; do not add labels yourself unless asked.

- Exactly one `release_note:*` label: `feature` (new capability), `enhancement` (improvement to an existing one), `fix` (bug in a released version), `breaking` (existing behavior stops working), `deprecation` (still works, removal planned). `skip` for everything else.
- Version labels for the exact patch releases the change ships in (`v9.6.0`, `v9.5.5`), one per minor. A label for an already released version means the entry is never collected; `git tag --list 'v9.5.*'` shows what has shipped.
- A team or feature label (`Team:Fleet`, `Feature:Discover`). `pivot.areas` and `pivot.products` in `docs/changelog.yml` map these to release-note sections and solution release notes.

## PR title

The PR title becomes the changelog `title`, the bullet users see in the release notes. It must stand alone. Shape: `[Verb] [user-visible outcome] [in/on/for feature, app, page, tab, flyout, or integration]`.

Verb, by type. Base form, never third person (`Fix`, not `Fixes`), never a noun phrase or gerund (`Ability to`, `Adding`), never a negative imperative (`Don't`, `Do not`):

| `type` | Expected leading verbs |
|---|---|
| `bug-fix` | `Fix`, `Resolve`, `Correct` |
| `enhancement` | `Improve`, `Update`, `Optimize`, `Enable`, `Expand`, `Enhance`, `Add` (minor capability) |
| `feature` | `Add`, `Introduce`, `Enable`, `Support` |
| `breaking-change` | any clear verb; the title must say what changes for the user |
| `deprecation` | `Deprecate`, `Remove` |

Type and title must agree. A `bug-fix` titled "Improve ..." or an `enhancement` titled "Fix ..." means one of them is wrong: broken behavior is `bug-fix`, optimizing working behavior is `enhancement`, substantial new capability is `feature`. When you cannot tell from the PR, offer both options (keep the type and rewrite the title, or keep the title and change the type) and say which the PR evidence favors.

Bug fixes name the symptom, not the restriction. "Don't allow runtime fields to shadow index sort fields" tells users what is now blocked; "Fix shard recovery failures when runtime fields shadow index sort fields" tells them what was broken. If a `bug-fix` title has restriction words (`allow`, `disallow`, `prevent`, `reject`, `validate`, `block`) and no symptom words (`fail`, `error`, `crash`, `hang`, `timeout`, `incorrect`, `missing`), rewrite it symptom-first, using the linked issue's wording when there is one. If the change only adds validation and nothing was failing before, the type is `enhancement`.

Describe what users see, not how the code changed. "Fix splitValue nullability coercion when constructing ColorSeries" becomes "Fix inline charts with grey time series for ES|QL queries". Class names, method names, hooks, tasks, saved object types, plugin IDs, flag names, and phrases like "Repro and fix" do not belong in a title.

Locate the change. Generic nouns (`button`, `metrics`, `monitors`, `response action`) need a surface: "in Synthetics", "in case details", "for Elastic Defend". Take it from the PR paths, labels, and body. Prefer adding context over trimming; if the title passes 80 characters, move detail into `description` rather than cutting the surface.

Clean the PR title before reusing it:

- Strip development prefixes and tracker fragments: `feat:`, `fix:`, `[Security Solution]`, `[ES|QL]`, `Bugfix -`, `(#12345)`.
- Fold a `[Feature]: [Action]` prefix into the sentence: "File upload: Fix bug" → "Fix upload failures in the file upload tool".
- Replace slash lists with Oxford-comma lists: `foo/bar/baz` → `foo, bar, and baz`.
- Strong verbs: "Improve validation for ..." not "Better validation for ...".
- Sentence case. No trailing period. No bare references ("PR #123", "bug #456").

Terms and formatting:

- Backticks for field names, parameter names, settings, API paths, commands, and literal values: `index.refresh_interval`, `POST /api/fleet/agents`.
- Quote a UI label when the phrase would otherwise read as prose: Fix "View in AI Assistant" button availability. Capitalize feature names and do not quote them: Machine Learning, Elastic Security.
- `ES|QL`, never `ESQL`. Keep `API`, `HTTP`, `OTLP`, `GPU` uppercase. Expand `NPE` to NullPointerException and `PIT` to point-in-time. Expand other acronyms only when the PR confirms the meaning.
- US English (`serialize`, `color`). Full words over abbreviations (`parameters`, not `params`).

## `## Release note` section

The `## Release note` section of the PR body becomes the changelog `description`. Add it to the PR body under exactly that heading (the extractor also accepts `Release note:`). It must be present for a breaking change or deprecation; for other types it is recommended whenever the title alone leaves a question.

- Third-person present, verb first: `Fixes`, `Adds`, `Improves`, `Enables`, `Removes`. Not past tense (`Fixed`), not base form (`Fix`), not "This PR adds".
- It must add something the title does not: what was wrong and what is now correct for a fix, what you can now do for a feature or enhancement. If it would only restate the title, omit the section. Never "See PR" or "Internal refactoring".
- Address the reader as "you". Never "users" or "customers".
- One sentence for a fix or small enhancement. One short paragraph at most for a feature or breaking change. Under 600 characters.
- Same term and formatting rules as the title: no internal names, backticks for code identifiers, `ES|QL`.
- `breaking-change` and `deprecation` need `impact` and `action`, also in third-person present. Write them as two labeled paragraphs inside the section (`**Impact:** ...` and `**Action:** ...`) so the docs team can lift them into the entry's `impact` and `action` fields. `impact` says what breaks and who is affected. `action` gives the concrete step, names the replacement API, setting, or workflow, and links to migration guidance when it exists.

Links and code inside these fields:

- Descriptive link text, never a bare URL or "click here".
- Links to Kibana docs use the docs path with its `.md` extension (`[Kibana settings](/reference/configuration-reference/general-settings.md)`); links to other Elastic docs use the cross-repo form (`[Reindex](elasticsearch://reference/...md)`). Never `https://www.elastic.co/docs/...` for Elastic docs. External links use the full `https://` URL.
- Code fences carry a language (`yaml`, `json`, `console`, `bash`); use `console` for Elasticsearch requests.

## The changelog entry

`docs/changelog/<pr-number>.yaml` is generated by the docs team at release time, not added by the PR author. Apply this section when you are asked to write, edit, or review an entry: a docs-team release-notes PR, a correction to a published entry, or an explicit request to supply the file.

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
- Alerting and reporting                  # exact strings from pivot.areas in docs/changelog.yml
title: "Fix dashboard filters not applying to embedded visualizations"
description: "Fixes dashboard filters not being applied to visualizations embedded by reference, so the filtered data matches what you see in the filter bar."
impact: "..."                             # breaking-change and deprecation only
action: "..."                             # breaking-change and deprecation only
```

- `type` comes from the label mapping in `docs/changelog.yml`: `release_note:fix` is `bug-fix`, `release_note:breaking` is `breaking-change`, `release_note:feature` is `feature`, `release_note:enhancement` is `enhancement`, `release_note:deprecation` is `deprecation`.
- `products`: `kibana` and `cloud-serverless` unless the change cannot reach one of them (a stateful-only setting, a serverless-only project type). Add `observability` or `security` only when a PR label maps to it under `pivot.products`. Never add `versions` or `target` to a product; a PR-linked entry gets its versions from the PR labels.
- `areas`: exact values from `pivot.areas`, chosen by the PR's labels. Omit the field when no label maps to an area; do not pick `Other` or invent a name.
- Wrap every text value (`title`, `description`, `impact`, `action`) in double quotes, always, and escape inner double quotes as `\"`. Unquoted `: `, `#`, `[`, `]`, `{`, or `}` break the YAML parse.

## Before finishing

Check your own output against these and fix it:

1. Would a user who has not read the PR know what changed and why they care, from the title alone?
2. Is the title a symptom or capability the user can see, not an implementation detail or a new restriction?
3. Do the `release_note:*` label (or `type`), the title's leading verb, and the release note's leading verb agree?
4. For an entry file: are all `areas` and `products` values present in `docs/changelog.yml`, and is every text value double-quoted?
5. Is anything in the text an internal name, an unexpanded acronym, or a term a serverless user could not see?

## Reviewing a PR

This section applies only when the diff touches `docs/changelog/*.yaml` or `docs/releases/**`. In practice that is a docs-team release-notes PR or a correction to a published entry. An ordinary feature or fix PR has nothing here to review: its release note lives in the title, labels, and body, which are not diff lines, so do not report anything about them. Anchor every finding to a changed line in a changed file and name the rule you applied; do not print a report.

`docs/releases/**` bundles are generated by `docs-builder` from the entries in `docs/changelog/`. A hand edit to a bundle is lost at the next build; report it on the changed lines and point to the entry file (or an amend sidecar next to the bundle) instead. `docs/release-notes/*.md` are hand-maintained by the docs team for stateful releases and are not generated; leave them alone unless the PR is from the docs team.

When the diff contains `docs/changelog/*.yaml`, read `docs/changelog.yml` at the PR head, then check each entry line by line. The `prs` URL names the source PR; the title and body you receive are for the release-notes PR, not that one, so judge the entry on its own text.

- File name is `<pr-number>.yaml` matching the number in `prs`.
- `type` is one of the values under `pivot.types`, and it agrees with the title's leading verb and the description. Offer both fixes (rewrite the title, or change the type) and say which the entry's own description supports.
- `title`: base-form verb from the table above, symptom-first for a `bug-fix`, user-visible outcome with a surface, no development prefix or team tag, no implementation names, sentence case, no trailing period. Over 80 characters is a note, not an error, unless the length comes from implementation detail.
- `description`: third-person present, adds something the title does not. Over 600 characters is a note.
- Every `areas` value is an exact string under `pivot.areas`; every `products[].product` is `kibana`, `cloud-serverless`, or a value under `pivot.products`; no `versions` or `target` on a product. Report an unknown value with the nearest valid one.
- `breaking-change` and `deprecation` entries have `impact` and `action`, and `action` names the replacement.
- A plain (unquoted) text value containing `: `, `#`, `[`, `]`, `{`, or `}` is a finding because it breaks the YAML parse. Do not flag quoting otherwise: an unquoted value without those characters and a block (`>-`) scalar are both fine. Links have descriptive text and no `https://www.elastic.co/docs/` URLs; code fences have a language.
- No internal names or unexpanded dev acronyms anywhere in `title`, `description`, `impact`, or `action`.

Do not report a missing changelog entry. Entries are generated after merge, so their absence from a PR is expected.

Reference: [Changelogs content type](https://www.elastic.co/docs/contribute-docs/content-types/changelogs) for the schema and the title cleanup checklist, [Elastic style guide](https://www.elastic.co/docs/contribute-docs/style-guide) for wording.
