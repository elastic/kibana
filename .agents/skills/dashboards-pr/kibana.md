# Kibana PR conventions

## Title

- **Format:** `[Area] Short human sentence`. It must read as a release note: Kibana uses the title when there's no `## Release note` section.
- **Area:** the user-facing feature name, matching the `Feature:*` label where one exists: `[Lens]`, `[Dashboard]`, `[Controls]`, `[Maps]`, `[ES|QL]`, `[Dashboards in Chat]`. Chain two only when it narrows the scope, as in `[Lens][Datatable]`.
- **Sentence:** present-tense verb, sentence case, no trailing period, about 70 characters at most.
- **Fixes:** describe the symptom the user saw, not the code fix: `Fix missing city dots on the Dark basemap`, not `Namespace zoom-function sprite ids`.
- **Features:** describe what users can now do.
- **Leave out:** issue numbers, Conventional Commit prefixes (`fix:`, `feat:`), file or function names.
- **Examples:** `[Links] Fix link settings not persisting`, `[Lens] Fit line charts by default`, `[kbn-grid-layout] Smoother scrolling`.
- **When rewriting:** propose a new title only if the current one breaks these rules, and show the old one next to it.

## Body order

1. `## Summary`
2. `Fixes https://github.com/elastic/kibana/issues/N` (full URL; `Part of` for partial work)
3. Problem, then solution, then Before and After
4. `## How to test` (reproduction link or steps, then verification steps)
5. Optional `## Release note`
6. `## Review notes`, content collapsed
7. `## Checklist`, content collapsed
8. `## Identify risks`, content collapsed

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

## Checklist source

Read `.github/PULL_REQUEST_TEMPLATE.md` on every run, so the description tracks the current template. Copy every item under `### Checklist` verbatim (including links), as a `- [ ]` / `- [x]` list. For `### Identify risks`, replace the template's checkboxes with prose: severity, what could go wrong, and the mitigation. Leave out the template's HTML comments and instructional sentences ("Check the PR satisfies following conditions.").

## Breaking changes

For breaking HTTP API or contract changes, add visible `## Impact` and `## Action` sections after `## How to test`, and suggest the `release_note:breaking` label. Mention that the breaking-change committee must approve.

## Labels

Suggest, in chat (never inside the body):

- one `release_note:*`: `release_note:fix` for a fix users can see, even a small one; `release_note:enhancement` / `release_note:feature` for new behavior; `release_note:skip` for internal-only changes;
- one `backport:*` (`backport:skip`, `backport:version` with the version labels, e.g. `v9.7.0`);
- `Team:*` and `Feature:*`, taken from the issue's labels when present, otherwise from the owners of the touched files (`kibana.jsonc` `owner`, `.github/CODEOWNERS`).

Apply labels with `--label` at creation (or `gh pr edit --add-label` in Update mode) only after approval; otherwise list them for the user to add.
