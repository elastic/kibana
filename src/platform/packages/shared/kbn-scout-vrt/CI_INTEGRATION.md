# CI Integration for @kbn/scout-vrt

This document covers the second and third rollout stages:

- generating and publishing canonical `main` baselines from CI
- hydrating those baselines in PR CI, running compare mode, and publishing review output

## Reviewer Summary

This stage closes the loop from baseline publication to PR review:

- merged `main` builds generate canonical baselines
- labeled PRs hydrate those baselines and run compare mode
- PR output is published as manifests, diff images, and a static review site

## On-Merge Baseline Publisher

The canonical `main` baseline job lives in Kibana's on-merge pipeline:

- pipeline file:
  - `.buildkite/pipelines/on_merge.yml`
- step label:
  - `Publish Main VRT Baselines`
- entrypoint:
  - `.buildkite/scripts/steps/scout_vrt/publish_main_baselines.sh`

That step:

1. discovers only VRT-enabled Scout configs
2. groups them by Scout target identity
3. runs `node scripts/scout_vrt run-tests --update-baselines`
4. packages the local baseline cache plus the corresponding manifests
5. publishes commit-addressable bundles and a moving `latest` alias

## Published Storage Layout

The publisher writes to:

- `gs://ci-artifacts.kibana.dev/vrt/baselines/main/commits/<commitSha>/index.json`
- `gs://ci-artifacts.kibana.dev/vrt/baselines/main/latest/index.json`

Each bundle is partitioned by:

- `location`
- `arch`
- `domain`
- `browser`
- `viewport`

For a bundle rooted at:

- `gs://ci-artifacts.kibana.dev/vrt/baselines/main/latest/<relativePath>/`

the publisher writes:

- `manifest.json`
- `<packageId>/manifest.json`
- baseline PNGs referenced by those manifests

The same bundle also gets a sibling archive:

- `gs://ci-artifacts.kibana.dev/vrt/baselines/main/latest/<relativePath>.tar.gz`

That archive contains the same manifest and image payload as the expanded bundle directory and exists to make whole-bundle download and transfer much cheaper.

## Baseline Catalog

`index.json` is the catalog entrypoint for downstream consumers.

Each catalog entry identifies one bundle and includes:

- the bundle's target identity
- the bundle `relativePath`
- the bundle `manifestPath`
- the sibling `archivePath`

The catalog is the source of truth for consumers that need to resolve the latest published baseline without knowing the full directory layout ahead of time.

## Manual Seeding for a Branch or Demo

If you want to seed baselines without merging to `main`, you can run the same publisher against a branch build or from a bespoke environment.

You need:

- a built Kibana install directory
- credentials that can write to `gs://ci-artifacts.kibana.dev`
- the same environment variables the publisher expects

Example:

```bash
export BUILDKITE_BUILD_ID=manual-$(date +%s)
export BUILDKITE_COMMIT=$(git rev-parse HEAD)
export KIBANA_BUILD_LOCATION=/absolute/path/to/kibana/build/install

.buildkite/scripts/steps/scout_vrt/publish_main_baselines.sh
```

Expected result:

- commit-addressable bundles under `.../commits/<commitSha>/...`
- a synchronized `.../latest/...` view
- a top-level `index.json`
- one `tar.gz` archive per bundle

## PR Compare Flow

The PR compare job lives in Kibana's pull-request pipeline and is opt-in by label:

- PR label:
  - `ci:vrt`
- pipeline file:
  - `.buildkite/pipelines/pull_request/vrt.yml`
- label gate:
  - `.buildkite/scripts/pipelines/pull_request/pipeline.ts`
- compare entrypoint:
  - `.buildkite/scripts/steps/scout_vrt/run_pr_vrt_compare.sh`

That step:

1. reads `gs://ci-artifacts.kibana.dev/vrt/baselines/main/latest/index.json`
2. resolves the matching bundle for the PR target
3. downloads the bundle archive when `archivePath` is available
4. falls back to syncing the expanded bundle directory when it is not
5. hydrates `.scout/baselines/vrt/...`
6. runs `node scripts/scout_vrt run-tests --compare-baselines`
7. publishes a static review site and CI summary output

## PR Outputs

A successful labeled PR run produces:

- raw run artifacts under the normal Scout artifact upload paths
- compare-mode manifests with `passed`, `failed`, and `missing-baseline` checkpoint states
- diff PNGs for mismatched checkpoints
- a static review site rooted at:
  - `https://ci-artifacts.kibana.dev/vrt/pr/<pr-number>/<build-id>/index.html`

The PR compare job is read-only with respect to baselines. It never blesses or mutates the published `main` baseline store.

## Demo And Validation Notes

To demo the full flow without merging to `main`:

1. seed the remote baseline catalog and bundles with the publisher
2. open a PR from the compare/reporting branch
3. add the `ci:vrt` label
4. confirm hydration, compare output, and review-site publication
5. rerun once without code changes to validate idempotence

## Operational Notes

- `latest/` is synchronized with deletion, so it remains a snapshot of the newest canonical baseline set rather than accumulating stale bundles.
- The archive path is an optimization for transfer and hydration. The expanded bundle layout remains the canonical browser-readable form.
- Baseline selection by commit or branch remains a CI concern. The runtime only knows how to write local baselines and emit manifests.
- PR compare hydration prefers the archive path so one bundle can be downloaded quickly without listing or transferring every object individually.
