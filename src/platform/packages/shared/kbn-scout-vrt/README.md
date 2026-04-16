# @kbn/scout-vrt

`@kbn/scout-vrt` adds a visual checkpoint layer to Scout UI tests.

## Reviewer Summary

This stage extends the foundation with baseline production and publication:

- local runs can write baselines with `--update-baselines`
- CI can publish canonical `main` baselines keyed by commit
- consumers can resolve the latest published baseline set through `index.json`

This stage still does not define:

- PR compare/reporting workflows
- PR-side baseline hydration
- approval flows

## What You Use

- `visualTest`
  - a Scout-compatible test fixture for marking visual checkpoints
- `createPlaywrightConfig`
  - a Playwright config wrapper that enables VRT artifact/report generation
- `node scripts/scout_vrt run-tests`
  - a helper CLI that discovers only VRT-enabled Scout suites and runs them in capture or baseline-update mode

## What The Runtime Produces

When you run `node scripts/scout_vrt run-tests`, the package captures one image per visual checkpoint and writes manifests that describe the run.

Run artifacts are written under:

- `.scout/test-artifacts/vrt/<runId>/manifest.json`
- `.scout/test-artifacts/vrt/<runId>/test-artifacts/<packageId>/manifest.json`
- `.scout/test-artifacts/vrt/<runId>/test-artifacts/<packageId>/<testKey>/<stepKey>.png`

Local baselines are written under:

- `.scout/baselines/vrt/<packageId>/<testKey>/<stepKey>.png`

The package keeps the contract stable by writing:

- a run-level manifest
- one package manifest per Kibana module
- checkpoint records with stable identity and source metadata

## Main Baseline Publishing

The on-merge baseline publisher stores canonical `main` baselines under:

- `ci-artifacts.kibana.dev/vrt/baselines/main/commits/<commitSha>/...`
- `ci-artifacts.kibana.dev/vrt/baselines/main/latest/...`

Each published bundle is partitioned by:

- `location`
- `arch`
- `domain`
- `browser`
- `viewport`

Each bundle contains:

- a filtered run manifest at `manifest.json`
- the corresponding package manifests at `<packageId>/manifest.json`
- the baseline images referenced by those manifests

A top-level `index.json` catalogs the published bundles for downstream consumers. Each catalog entry also advertises a sibling bundle archive at `<bundle>.tar.gz`, so CI and local tooling can download one file per baseline bundle instead of recursively transferring the full expanded directory.

For the CI details, see [CI_INTEGRATION.md](/Users/clint/Projects/kibana.worktrees/scout-vrt/src/platform/packages/shared/kbn-scout-vrt/CI_INTEGRATION.md).

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
  - in this stage: `captured` or `updated`
- `imagePath`
- `source.file`, `source.line`, `source.column`

## Scope

The package is intentionally limited to:

- sequential UI suites
- viewport screenshots
- local artifact generation
- main-baseline publication
- no PR compare/reporting workflow yet
- no approval workflow

## Next Docs

- See [GETTING_STARTED.md](/Users/clint/Projects/kibana.worktrees/scout-vrt/src/platform/packages/shared/kbn-scout-vrt/GETTING_STARTED.md) for local authoring, capture, and baseline generation.
- See [CI_INTEGRATION.md](/Users/clint/Projects/kibana.worktrees/scout-vrt/src/platform/packages/shared/kbn-scout-vrt/CI_INTEGRATION.md) for on-merge baseline publication and manual seeding.
