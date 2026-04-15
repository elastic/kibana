# Driftik Integration Plan

This document lays out a practical PR4 plan for replacing the temporary Kibana HTML review report with a Driftik-powered static viewer in CI.

## Recommendation

For the first Driftik-backed integration, Kibana should consume a pinned, prebuilt Driftik static bundle and generate a Driftik-compatible payload during PR VRT reporting.

That means:

- Kibana remains the owner of visual comparison, manifests, artifact layout, and CI orchestration
- Driftik becomes the viewer only
- Kibana does not build Driftik from source inside the PR VRT job
- Kibana does not require Driftik to support Kibana manifests natively on day one

This is the lowest-risk path because it avoids cross-repo dependency installation and lets Kibana swap viewers without changing its comparison runtime.

## Driftik Repo Review

This plan is based on the current `main` branch of [elastic/driftik](https://github.com/elastic/driftik) at commit `b857547bb2eeac6f71e90b59c738f8a9b11a8caa`.

Relevant findings:

- Driftik is a Vite/React app with a static build produced by `yarn build`
- the build output is `dist/` and the Vite `base` is `./`, which is friendly to static subdirectory hosting
- Driftik currently includes a comparison CLI in [`scripts/compare.ts`](https://github.com/elastic/driftik/blob/main/scripts/compare.ts)
- the UI currently expects to fetch a manifest from `./diff/manifest.json`
- the UI expects a Driftik-specific flat manifest containing entries with:
  - `plugin`
  - `testName`
  - `screenshotName`
  - `baselinePath`
  - `candidatePath`
  - optional `diffPath`
  - `mismatchPixels`
  - `mismatchRatio`
- Driftik today assumes it owns diff generation and manifest generation

## Key Design Choice

There are two viable integration strategies.

### Option A: Adapter manifest in Kibana

Kibana generates the current Driftik manifest shape and asset layout during PR reporting, then serves a pinned Driftik build on top of that payload.

Pros:

- fastest path to value
- little or no Driftik runtime change required
- avoids blocking PR4 on a larger Driftik refactor

Cons:

- Kibana temporarily emits two data models:
  - Kibana VRT manifests as the system of record
  - Driftik adapter manifest as a view model

### Option B: Native Kibana manifest support in Driftik

Driftik learns how to read Kibana VRT manifests directly and no adapter manifest is generated.

Pros:

- cleaner long-term architecture
- one manifest contract end to end

Cons:

- larger cross-repo coordination cost
- higher implementation risk for the first integration

## Recommendation For PR4

Use Option A first.

PR4 should:

- replace the handwritten HTML review site
- keep Kibana manifests as the source of truth
- generate a Driftik adapter manifest during publish
- mount a pinned Driftik `dist/` bundle over that payload

Then, in a later Driftik follow-up, we can move to native Kibana manifest support and remove the adapter.

## Proposed CI Artifact Model

The PR VRT publish directory should become:

- `index.html`
- `assets/*` from the Driftik build
- `diff/manifest.json`
- `diff/images/baseline/...`
- `diff/images/candidate/...`
- `diff/images/diff/...`
- `json/<runId>/manifest.json`
- `json/<runId>/<packageId>/manifest.json`
- any additional raw data Kibana wants to preserve for future viewers

The important compatibility detail is that Driftik currently fetches `./diff/manifest.json`, so Kibana should publish that exact path in v1.

## Driftik Release Artifact Plan

Driftik should publish a pinned static build artifact that Kibana can download in CI.

### Driftik repo work

Add a release or CI workflow in Driftik that:

1. runs `yarn install`
2. runs `yarn build`
3. archives `dist/` as `driftik-<version>.tar.gz`
4. publishes the tarball and checksum to a stable location

Preferred publish targets:

1. GitHub release artifacts in the Driftik repo
2. `gs://ci-artifacts.kibana.dev/driftik/releases/...`

Expected metadata:

- version
- tarball URL
- SHA256 checksum
- source commit SHA

## Kibana PR4 Scope

Kibana PR4 should do the following.

### 1. Pin a Driftik build

Add a small pinned build descriptor in Kibana, for example:

- `.buildkite/scripts/steps/scout_vrt/driftik_build.ts`
- or `src/platform/packages/shared/kbn-scout-vrt/driftik_build.json`

Suggested fields:

- `version`
- `url`
- `sha256`
- `sourceCommit`

### 2. Download and extract Driftik in PR compare CI

Update [`run_pr_vrt_compare.ts`](/Users/clint/Projects/kibana.worktrees/scout-vrt/.buildkite/scripts/steps/scout_vrt/run_pr_vrt_compare.ts) so that it:

- downloads the pinned Driftik tarball
- verifies the checksum
- extracts the `dist/` directory into the PR publish root

This should replace the temporary HTML writer, not sit beside it.

### 3. Generate a Driftik adapter manifest

Transform the Kibana compare output into the current Driftik manifest shape at:

- `diff/manifest.json`

Each Driftik manifest entry should be derived from Kibana package results:

- `plugin`
  - from `packageId`
- `testName`
  - from `result.testTitle`
- `screenshotName`
  - from `result.stepTitle`
- `baselinePath`
  - `diff/images/baseline/<imagePath>`
- `candidatePath`
  - `diff/images/candidate/<runId>/<imagePath>`
- `diffPath`
  - `diff/images/diff/<runId>/<diffPath>`
- `width`
  - from the source image dimensions if available, otherwise computed at staging time
- `height`
  - same as above
- `mismatchPixels`
  - `0` initially if not tracked directly
- `mismatchRatio`
  - `mismatchPercent / 100`
- `threshold`
  - a fixed threshold value for now, documented as viewer metadata

### 4. Stage images in Driftik's expected layout

Copy assets into:

- `diff/images/baseline/...`
- `diff/images/candidate/<runId>/...`
- `diff/images/diff/<runId>/...`

This preserves the current Driftik UI assumptions and avoids any immediate Driftik viewer refactor.

### 5. Preserve Kibana-native data

Do not remove the Kibana-native manifests from the publish output.

Keep:

- `json/<runId>/manifest.json`
- `json/<runId>/<packageId>/manifest.json`

That preserves the real system-of-record contract while Driftik uses the adapter manifest for display.

### 6. Upload the assembled static site

Continue uploading to:

- `https://ci-artifacts.kibana.dev/vrt/pr/<pr-number>/<build-id>/index.html`

But the entrypoint will now be Driftik's `index.html`, not the handwritten HTML report.

## Proposed Implementation Steps

### Driftik repo

1. add a release build workflow for `dist/`
2. publish a tarball plus checksum
3. document the supported static hosting assumptions:
  - relative `base`
  - expected manifest path

### Kibana repo

1. add a pinned Driftik build descriptor
2. add a helper to download and verify the tarball
3. replace `writeReviewSite(...)` with:
  - `stageDriftikReviewPayload(...)`
  - `writeDriftikAdapterManifest(...)`
  - `extractPinnedDriftikBuild(...)`
4. keep current annotation and PR comment logic unchanged
5. keep current compare logic unchanged

## Acceptance Criteria

PR4 is successful when:

- a labeled PR publishes a Driftik-backed review site
- the published site loads without a server-side runtime
- baseline, candidate, and diff images render correctly
- missing-baseline cases remain obvious in CI output
- Kibana still publishes its native run/package manifests
- rerunning the same PR build is idempotent

## Known Gaps To Address Later

These should not block PR4.

- Driftik native support for Kibana manifests
- richer status rendering for `missing-baseline`
- source-file linking from the viewer
- approvals or baseline promotion
- release-drift viewer support

## Follow-on Driftik Work

After PR4 lands, the next Driftik-facing improvement should be:

1. support a viewer config file or manifest URL override
2. support Kibana VRT manifests directly
3. stop requiring `./diff/manifest.json`
4. understand Kibana-specific status values and summaries

At that point, Kibana can stop generating the adapter manifest and publish only the native data contract.

## Review Checklist

Before implementation, confirm:

1. where Driftik release tarballs will be published
2. whether Kibana will pin by URL, version, or version plus checksum
3. whether Kibana should generate adapter dimensions from image files or extend its manifests to include them
4. whether `mismatchPixels` must be exact in v1 or can be omitted/derived later
5. whether the temporary Kibana HTML viewer should be removed immediately or retained behind a flag during rollout
