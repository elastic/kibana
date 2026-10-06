---
name: changelog-entry
description: Write the release note for a Kibana pull request. Shapes the three things the docs team's tooling turns into a changelog entry after merge: the release_note:* label, the PR title (becomes the release-note title), and the "## Release note" section of the PR body (becomes the description). Use when opening or updating a PR with a release_note:feature, release_note:enhancement, release_note:fix, release_note:breaking, or release_note:deprecation label, when asked for a PR title or release note, or when a PR body needs a "## Release note" section. Applies the Elastic changelog standards (docs-fix-changelog and docs-review-changelog in elastic/elastic-docs-skills) and Kibana's docs/changelog.yml configuration.
metadata:
  source: https://github.com/elastic/elastic-docs-skills/tree/main/skills/changelogs/docs-fix-changelog
  source_version: "2.6.3"
---

# Changelog entry

Release notes for Kibana and serverless are generated after merge. At release time the docs team runs `docs-builder` over the merged PRs: the `release_note:*` label becomes the entry `type`, the PR title (with any `[Team]` prefix stripped) becomes the entry `title`, and the `## Release note` section of the PR body becomes the `description`. PR authors do not write that entry; they control the three inputs. Write the PR title and `## Release note` section as the final text users will read, because that is what they become.

Accuracy over style. Never trade a correct statement for a better-sounding one. When the PR does not tell you what the user sees, ask; do not infer a symptom.

## When to stop

- The PR has `release_note:skip`, or the change is test-only, refactor-only, docs-only, internal plumbing, or a fix for a feature that has not shipped. Say so and produce nothing. If a changelog entry already exists for such a PR, recommend deleting it rather than polishing it.
- The PR is a backport (base branch other than `main`, `[9.5]`-style title prefix, or `backport` label when labels are visible). The release note lives on the original PR.

## Inputs

Read, in this order: PR title, labels, body, linked issues, and the changed files. Locally, `gh pr view <n> --json title,labels,body,files` and `gh pr diff <n>` supply these; otherwise use what you are given. Linked issues matter: an issue title usually states the user-visible symptom better than the PR title does. Then read `docs/changelog.yml` for the current label-to-type, label-to-area, and label-to-product mappings under `pivot`. Do not guess values that file defines.

If the PR title contains an acronym or internal shorthand you cannot resolve from the body or diff, ask what it stands for. Do not guess an expansion.

## Labels (check first)

Every release-noted PR needs all three. Report any that are missing or wrong; do not add labels yourself unless asked.

- Exactly one `release_note:*` label: `feature` (new capability), `enhancement` (improvement to an existing one), `fix` (bug in a released version), `breaking` (existing behavior stops working), `deprecation` (still works, removal planned). `skip` for everything else.
- Version labels for the exact patch releases the change ships in (`v9.6.0`, `v9.5.5`), one per minor. A label for an already released version means the entry is never collected; `git tag --list 'v9.5.*'` shows what has shipped.
- A team or feature label (`Team:Fleet`, `Feature:Discover`). `pivot.areas` and `pivot.products` in `docs/changelog.yml` map these to release-note sections and solution release notes.

## PR title

The PR title becomes the changelog `title`, the bullet users see in the release notes. It must stand alone. Shape: `[Verb] [user-visible outcome] [in/on/for feature, app, page, tab, flyout, or integration]`.

Verb, by label. Base form, never third person (`Fix`, not `Fixes`), never a noun phrase or gerund (`Ability to`, `Adding`), never a negative imperative (`Don't`, `Do not`):

| Label | Expected leading verbs |
|---|---|
| `release_note:fix` | `Fix`, `Resolve`, `Correct` |
| `release_note:enhancement` | `Improve`, `Update`, `Optimize`, `Enable`, `Expand`, `Enhance`, `Add` (minor capability) |
| `release_note:feature` | `Add`, `Introduce`, `Enable`, `Support` |
| `release_note:breaking` | any clear verb; the title must say what changes for the user |
| `release_note:deprecation` | `Deprecate`, `Remove` |

Label and title must agree. A `release_note:fix` titled "Improve ..." or a `release_note:enhancement` titled "Fix ..." means one of them is wrong: broken behavior is a fix, optimizing working behavior is an enhancement, substantial new capability is a feature. When you cannot tell from the PR, offer both options (keep the label and rewrite the title, or keep the title and change the label) and say which the PR evidence favors.

Bug fixes name the symptom, not the restriction. "Don't allow runtime fields to shadow index sort fields" tells users what is now blocked; "Fix shard recovery failures when runtime fields shadow index sort fields" tells them what was broken. If a fix title has restriction words (`allow`, `disallow`, `prevent`, `reject`, `validate`, `block`) and no symptom words (`fail`, `error`, `crash`, `hang`, `timeout`, `incorrect`, `missing`), rewrite it symptom-first, using the linked issue's wording when there is one. If the change only adds validation and nothing was failing before, the label is `release_note:enhancement`.

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

The `## Release note` section of the PR body becomes the changelog `description`. Put it in the PR body under a `Release note` heading at any level (`##` or `###`) or a `Release note:` label; the extractor reads the text that follows. It must be present for a breaking change or deprecation; for other types it is recommended whenever the title alone leaves a question.

- Third-person present, verb first: `Fixes`, `Adds`, `Improves`, `Enables`, `Removes`. Not past tense (`Fixed`), not base form (`Fix`), not "This PR adds".
- It must add something the title does not: what was wrong and what is now correct for a fix, what you can now do for a feature or enhancement. If it would only restate the title, omit the section. Never "See PR" or "Internal refactoring".
- Address the reader as "you". Never "users" or "customers".
- One sentence for a fix or small enhancement. One short paragraph at most for a feature or breaking change. Under 600 characters.
- Same term and formatting rules as the title: no internal names, backticks for code identifiers, `ES|QL`.
- `release_note:breaking` and `release_note:deprecation` need `impact` and `action`, also in third-person present. Write them as two labeled paragraphs inside the section (`**Impact:** ...` and `**Action:** ...`) so the docs team can lift them into the entry's `impact` and `action` fields. `impact` says what breaks and who is affected. `action` gives the concrete step, names the replacement API, setting, or workflow, and links to migration guidance when it exists.

Links and code inside these fields:

- Descriptive link text, never a bare URL or "click here".
- Links to Kibana docs use the docs path with its `.md` extension (`[Kibana settings](/reference/configuration-reference/general-settings.md)`); links to other Elastic docs use the cross-repo form (`[Reindex](elasticsearch://reference/...md)`). Never `https://www.elastic.co/docs/...` for Elastic docs. External links use the full `https://` URL.
- Code fences carry a language (`yaml`, `json`, `console`, `bash`); use `console` for Elasticsearch requests.

## Before finishing

Check your own output against these and fix it:

1. Would a user who has not read the PR know what changed and why they care, from the title alone?
2. Is the title a symptom or capability the user can see, not an implementation detail or a new restriction?
3. Do the `release_note:*` label, the title's leading verb, and the release note's leading verb agree?
4. Does the PR carry the `release_note:*`, version, and team labels, and does the body have a `Release note` heading with the text under it?
5. Is anything in the text an internal name, an unexpanded acronym, or a term a serverless user could not see?

Reference: [Changelogs content type](https://www.elastic.co/docs/contribute-docs/content-types/changelogs) for the title cleanup checklist, [Elastic style guide](https://www.elastic.co/docs/contribute-docs/style-guide) for wording.
