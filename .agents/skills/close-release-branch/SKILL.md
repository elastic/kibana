---
name: close-release-branch
description: Retire an end-of-life Kibana release branch (e.g. 9.3) from CI — versions.json, Buildkite pipeline resource definitions and schedules, renovate.json. Use when discontinuing support for a release branch, closing/removing an old release branch, or dropping a version from CI.
---

# Close a release branch

Removes a release branch (e.g. `9.3`) from CI once the minor is end-of-life. All changes happen on `main` — `versions.json` is only maintained there.

## Workflow

1. **Find the precedent commit** for the last branch removal and use it as a template:
   `git log --oneline --grep="remove branch" -- versions.json` (e.g. #267826 removed 9.2).
2. **Grep for the branch name** across the repo (`"9.3"`, `'9.3'`, `9.3 ` in lists) to build the full file list — the set below drifts over time. Distinguish CI branch references from product version strings (ECS pins, test fixtures, release notes, package versions): leave the latter alone.
3. Make the edits (below).
4. **Validate**: JSON files parse, `cd .buildkite && npx jest --config jest.config.js scripts/pipelines/trigger_version_dependent_jobs && npx tsc --noEmit`.
5. Open a draft PR (`release_note:skip`, `Team:Operations`) and list the out-of-repo follow-ups in the description.

## Edits on main

- `versions.json` — remove the branch's entry. This alone drives the dynamic matrices (artifact snapshot/staging/trigger pipelines and the ES forward-compatibility pipeline read it via `getVersionsFile()`), so those need no edits.
- `.buildkite/pipeline-resource-definitions/*.yml` — remove the branch from every `branch_configuration` list and delete per-branch `schedules` entries. Known spots: `kibana-es-snapshots.yml`, `kibana-on-merge.yml`, `kibana-console-definitions-sync.yml`, `kibana-scout-update-metadata.yml` — always grep for the full set.
- `renovate.json` — remove the branch from `baseBranches`.
- `.backportrc.json` — **do not touch**; historical branches stay listed (9.0–9.2 are still there).

## Out-of-repo follow-ups (list them, don't attempt)

- **Buildkite UI**: schedules/pipelines are synced from the resource definitions; verify and decommission leftovers after merge.
- **GitHub**: branch deletion and protection-rule cleanup happen outside the repo.
- **Release-branch companions**: some pipeline files live on release branches, not `main` (e.g. the ES forward-compat pipeline file `.buildkite/pipelines/es_forward_9_dot_x.yml` lives on `8.19`, because triggered builds execute there). Check whether the retired branch hosts any, and whether surviving branches need a companion PR.

## Gotchas

- Keep pipeline/slug names version-agnostic. Don't introduce the retired version into new names — the ES forward-compat pipeline's labels were made version-agnostic (`9.x`) precisely because the versioned name had to be carried around on every EOL.
- **Resource definitions: identity vs labels.** The file name and `metadata.name` (`bk-<slug>`) are the pipeline's identity — the materialization engine deletes and recreates the pipeline if they change, losing build history. Only update human-facing labels in place (display `name`, schedule names/messages, descriptions) and keep identity fields frozen, even when they carry a stale version. Trigger steps target the Buildkite slug, so they must keep pointing at the frozen slug too (see the `es-forward-9-dot-x` → `...-9-dot-3` mapping in `trigger_version_dependent_jobs/pipeline.ts`).
- The `versions.json` notice is real: never backport these changes; release branches keep their own frozen copy.
