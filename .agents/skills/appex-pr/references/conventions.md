# Kibana PR conventions

## Title

- **Format:** `[Area] Short human sentence`. It must read as a release note: Kibana uses the title without the `[Area]` prefix when there's no `## Release note` section.
- **Area:** the user-facing feature name, matching the `Feature:*` label where one exists: `[Lens]`, `[Dashboard]`, `[Controls]`, `[Maps]`, `[ES|QL]`, `[Dashboards in Chat]`, `[Discover]`, `[Data Views]`. Chain two only when it narrows the scope, as in `[Lens][Datatable]`.
- **Sentence:** start with an action verb such as Add, Fix, Improve, Show or Prevent, and say where the change is. Present tense, sentence case, no trailing period, under 80 characters.
- **Fixes:** describe the symptom the user saw, not the code fix: `Fix missing city dots on the Dark basemap`, not `Namespace zoom-function sprite ids`.
- **Features:** describe what users can now do.
- **Leave out:** issue numbers, Conventional Commit prefixes (`fix:`, `feat:`), file or function names.
- **Examples:** `[Links] Fix link settings not persisting`, `[Lens] Fit line charts by default`.
- **When rewriting:** propose a new title only if the current one breaks these rules, and show the old one next to it.

## Body order

1. `## Summary`
2. `Fixes https://github.com/elastic/kibana/issues/N` (full URL; `Part of` for partial work)
3. Problem, then solution, then Before and After
4. `## How to test` (reproduction link or steps, then verification steps)
5. `## Impact` and `## Action`, only for breaking changes and deprecations (see "Breaking changes and deprecations")
6. Optional `## Release note`
7. `## Review notes`, content collapsed
8. `## Checklist`, content collapsed
9. `## Identify risks`, content collapsed

Skeleton:

```markdown
## Summary

Fixes https://github.com/elastic/kibana/issues/N

<problem as the user sees it, 1-3 sentences>

<solution at a high level, 1-3 sentences>

| Before | After |
| --- | --- |
| <!-- screenshot or video --> | <!-- screenshot or video --> |

## How to test

**Reproduce on `main`** (or: Reproduction steps: <link to the issue or comment>)

1. ...

**Verify on this branch**

1. ...

## Review notes

<details>
<summary>Where to start, intended behavior, extra changes, open items</summary>

#### Start here

...

#### Intended behavior

- ...

#### Also in this PR

- ...

#### Open

- ...

</details>

## Checklist

<details>
<summary>N of M checked. The others don't apply: ...</summary>

<template checklist items, verbatim, ticked where verified>

</details>

## Identify risks

<details>
<summary>Low|Medium|High: <main risk></summary>

<risk, severity, mitigation>

</details>
```

Every collapsed section keeps its visible `##` heading, and its `<summary>` is one line of plain text that is useful without expanding. An `<h2>` inside `<summary>` gets GitHub's fixed heading margins, which leave large gaps between stacked blocks.

## Checklist source

Read `.github/PULL_REQUEST_TEMPLATE.md` on every run, so the description tracks the current template. Copy every item under `### Checklist` verbatim (including links), as a `- [ ]` / `- [x]` list. For `### Identify risks`, replace the template's checkboxes with prose: severity, what could go wrong, and the mitigation. Leave out the template's HTML comments and instructional sentences ("Check the PR satisfies following conditions.").

## Breaking changes and deprecations

For breaking HTTP API or contract changes, and for deprecations, add visible `## Impact` and `## Action` sections after `## How to test`, and suggest the `release_note:breaking` or `release_note:deprecation` label. For breaking changes, ask whether the breaking-change committee has already approved; it must before the PR is merged. Never mention or link the committee's internal issue in the PR. Instead, remind the user in chat to add the PR link to that issue.

## Labels

Suggest, in chat (never inside the body):

- one `release_note:*` type: `release_note:fix` for a fix users can see; `release_note:feature` for something new; `release_note:enhancement` for improving something existing; `release_note:breaking` or `release_note:deprecation` for changes that need `## Impact` and `## Action`; `release_note:skip` only if users won't notice the change;
- for plugin API changes, `release_note:plugin_api_changes` as well, next to the type label, never instead of it;
- one `backport:*` (`backport:skip`, `backport:version` with the version labels, e.g. `v9.7.0`);
- `Team:*` and `Feature:*`, taken from the issue's labels when present, otherwise from the owners of the touched files (`kibana.jsonc` `owner`, `.github/CODEOWNERS`).

In Update mode, apply labels with `gh pr edit --add-label` only after approval; otherwise list them for the user to add. When an approved update changes the `release_note:*` type or the `backport:*` label, remove the old label in the same command with `--remove-label`, since a PR must carry exactly one of each.
