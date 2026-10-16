---
name: changelog-entry
description: >
  Write the release note for a Kibana pull request: the release_note:* label, the PR
  title, and the "## Release note" section of the PR body. The title and section are
  published as-is in the release notes. Use when opening or updating a PR with a
  release_note:feature, release_note:enhancement, release_note:fix, release_note:breaking,
  or release_note:deprecation label, or when asked for a PR title or release note.
metadata:
  source: https://github.com/elastic/elastic-docs-skills/tree/main/skills/changelogs/docs-fix-changelog
  source_version: "2.6.3"
---

# Release note

The PR title and the `## Release note` section of the PR body are published as-is in the release notes. Write them as the final text users will read.

Accuracy over style. When the PR does not tell you what the user sees, ask; do not infer a symptom. If the title has an acronym or shorthand you cannot resolve from the PR, ask; do not guess.

## When to stop

- `release_note:skip`, or a change that is test-only, refactor-only, docs-only, internal plumbing, or a fix to an unshipped feature. Say so and produce nothing.
- `release_note:plugin_api_changes`. That label feeds the Plugin API changes page in the Developer Guide, not the release notes. The PR needs a clear title and a description of the API change for plugin developers; the rules below do not apply.
- A backport PR (base branch other than `main`, `[9.5]`-style title prefix, or `backport` label). The release note lives on the original PR.

## Inputs

PR title, labels, body, linked issues, and diff (`gh pr view <n> --json title,labels,body` and `gh pr diff <n>`, or what you are given). Read the linked issue: its title usually states the user-visible symptom better than the PR title does.

## Labels

Every release-noted PR needs all three. Report what is missing or wrong; do not add labels unless asked.

- One `release_note:*` label: `feature` (new capability), `enhancement` (improvement to an existing one), `fix` (bug in a released version), `breaking` (existing behavior stops working), `deprecation` (still works, removal planned).
- Version labels for the exact releases the change ships in (`v9.6.0`, `v9.5.5`), one per minor. A label for an already released version is dropped; `git tag --list 'v9.5.*'` shows what has shipped.
- A team or feature label (`Team:Fleet`, `Feature:Discover`).

## PR title

Shape: `[Verb] [user-visible outcome] [in/on/for feature, app, page, tab, flyout, or integration]`. Under 80 characters; if context pushes it over, move detail into the release note rather than cutting the surface.

Leading verb, base form (`Fix`, not `Fixes`; never `Adding`, `Ability to`, `Don't`):

| Label | Verbs |
|---|---|
| `release_note:fix` | `Fix`, `Resolve`, `Correct` |
| `release_note:enhancement` | `Improve`, `Update`, `Optimize`, `Enable`, `Expand`, `Add` (minor capability) |
| `release_note:feature` | `Add`, `Introduce`, `Enable`, `Support` |
| `release_note:breaking` | any clear verb; say what changes for the user |
| `release_note:deprecation` | `Deprecate`, `Remove` |

Label and verb must agree. A fix titled "Improve ..." or an enhancement titled "Fix ..." means one is wrong: broken behavior is a fix, optimizing working behavior is an enhancement, substantial new capability is a feature. When the PR does not settle it, offer both (rewrite the title, or change the label) and say which the evidence favors.

Fixes name the symptom, not the restriction. "Don't allow runtime fields to shadow index sort fields" says what is now blocked; "Fix shard recovery failures when runtime fields shadow index sort fields" says what was broken. Restriction words (`allow`, `prevent`, `reject`, `validate`, `block`) without symptom words (`fail`, `error`, `crash`, `hang`, `incorrect`, `missing`) mean rewrite, using the linked issue's wording. If nothing was failing before, the label is `release_note:enhancement`.

Say what users see, not how the code changed. "Fix splitValue nullability coercion when constructing ColorSeries" becomes "Fix inline charts with grey time series for ES|QL queries". No class, method, hook, task, saved object, plugin, or flag names.

Locate generic nouns (`button`, `metrics`, `monitors`): "in Synthetics", "in case details", "for Elastic Defend".

Clean up:

- Strip prefixes and tracker fragments: `feat:`, `fix:`, `[Security Solution]`, `[ES|QL]`, `Bugfix -`, `(#12345)`.
- Fold `[Feature]: [Action]` into a sentence: "File upload: Fix bug" → "Fix upload failures in the file upload tool".
- Slash lists become Oxford-comma lists: `foo/bar/baz` → `foo, bar, and baz`.
- "Improve validation for ...", not "Better validation for ...".
- Sentence case. No trailing period. No "PR #123" or "bug #456".

Formatting:

- Backticks for settings, fields, parameters, API paths, commands, literal values: `index.refresh_interval`, `POST /api/fleet/agents`.
- Quote a UI label only when it would otherwise read as prose: Fix "View in AI Assistant" button availability. Feature names are capitalized, not quoted: Machine Learning.
- `ES|QL`, never `ESQL`. `API`, `HTTP`, `OTLP` stay uppercase. Expand `NPE` and `PIT`; expand other acronyms only when the PR confirms the meaning.
- US English. `parameters`, not `params`.

## `## Release note` section

Required for `release_note:breaking` and `release_note:deprecation`. For other labels, include it when the title alone leaves a question; omit it when it would only restate the title. Any heading level works.

- Third-person present, verb first: `Fixes`, `Adds`, `Improves`, `Enables`, `Removes`. Not `Fixed`, not `Fix`, not "This PR adds".
- Say what was wrong and what is now correct (fix), or what you can now do (feature, enhancement). Never "See PR" or "Internal refactoring".
- Address the reader as "you". Never "users" or "customers".
- One sentence for a fix or small enhancement. One short paragraph at most otherwise. Under 600 characters.
- Same formatting rules as the title.
- Breaking changes and deprecations add two labeled paragraphs: `**Impact:**` what breaks and who is affected; `**Action:**` the concrete step, naming the replacement API, setting, or workflow, with a link to migration guidance when one exists.
- Links use descriptive text, never a bare URL. Kibana docs: `[Kibana settings](/reference/configuration-reference/general-settings.md)`. Other Elastic docs: `[Reindex](elasticsearch://reference/...md)`. Never `https://www.elastic.co/docs/...`.
- Code fences carry a language; use `console` for Elasticsearch requests.

## Before finishing

1. From the title alone, would a user who has not read the PR know what changed and why they care?
2. Is the title a symptom or capability the user can see, not an implementation detail or a new restriction?
3. Do the label, the title verb, and the release-note verb agree?
4. Are the three labels present, and is the release note under a `Release note` heading?
5. Is anything an internal name, an unexpanded acronym, or a term a serverless user could not see?

Reference: [Changelogs](https://www.elastic.co/docs/contribute-docs/content-types/changelogs), [Elastic style guide](https://www.elastic.co/docs/contribute-docs/style-guide).
