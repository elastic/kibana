# CI Integration for @kbn/scout-vrt

This document covers the second rollout stage: generating and publishing canonical `main` baselines from CI.

It does not yet cover PR comparison or review-site generation. Those are added in the next stage.

## Reviewer Summary

This stage introduces baseline production, not baseline consumption:

- merged `main` builds generate canonical baselines
- those baselines are published by commit and through a moving `latest` alias
- consumers resolve them through a catalog and optional per-bundle archive

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

## Operational Notes

- `latest/` is synchronized with deletion, so it remains a snapshot of the newest canonical baseline set rather than accumulating stale bundles.
- The archive path is an optimization for transfer and hydration. The expanded bundle layout remains the canonical browser-readable form.
- Baseline selection by commit or branch remains a CI concern. The runtime only knows how to write local baselines and emit manifests.
