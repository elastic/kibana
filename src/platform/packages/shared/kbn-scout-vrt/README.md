# @kbn/scout-vrt

`@kbn/scout-vrt` adds a visual checkpoint layer to Scout UI tests.

## Reviewer Summary

This foundation stage does three things:

- lets Scout suites opt into visual checkpoints with `visualTest`
- captures one screenshot per checkpoint into Scout's artifact tree
- writes versioned run and package manifests for downstream tooling

This stage does not yet define:

- baseline generation or publication
- baseline hydration
- PR compare/reporting workflows

## What You Use

- `visualTest`
  - a Scout-compatible test fixture for marking visual checkpoints
- `createPlaywrightConfig`
  - a Playwright config wrapper that enables VRT artifact/report generation
- `node scripts/scout_vrt run-tests`
  - a helper CLI that discovers only VRT-enabled Scout suites and runs them in capture mode

## What Capture Mode Produces

When you run `node scripts/scout_vrt run-tests`, the package captures one image per visual checkpoint and writes manifests that describe the run.

Artifacts are written under:

- `.scout/test-artifacts/vrt/<runId>/manifest.json`
- `.scout/test-artifacts/vrt/<runId>/test-artifacts/<packageId>/manifest.json`
- `.scout/test-artifacts/vrt/<runId>/test-artifacts/<packageId>/<testKey>/<stepKey>.png`

The package keeps the contract stable by writing:

- a run-level manifest
- one package manifest per Kibana module
- checkpoint records with stable identity and source metadata

## Public Contract

`@kbn/scout-vrt` owns the local VRT manifest contract that later CI and review tooling can consume directly.

- `VISUAL_REGRESSION_SCHEMA_VERSION` is exported and currently set to `1`
- package manifests describe one Kibana module's checkpoints for a single run/browser/viewport
- run manifests describe the full run summary plus the package manifests that belong to it
- `VisualCheckpointRecord` is the checkpoint-level record shape written into package manifests

Stable downstream fields in `VisualCheckpointRecord`:

- `testFile`, `testTitle`, `testKey`
- `stepTitle`, `stepIndex`, `snapshotName`
- `status`
  - in this stage: `captured`
- `imagePath`
- `source.file`, `source.line`, `source.column`

## Scope

The package is intentionally limited to:

- sequential UI suites
- viewport screenshots
- local artifact generation
- no baseline lifecycle yet
- no CI orchestration yet
- no approval workflow

## Next Doc

See [GETTING_STARTED.md](/Users/clint/Projects/kibana.worktrees/scout-vrt/src/platform/packages/shared/kbn-scout-vrt/GETTING_STARTED.md) for a local authoring and capture walkthrough.
