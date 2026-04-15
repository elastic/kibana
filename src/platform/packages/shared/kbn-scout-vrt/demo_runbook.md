# Scout VRT Demo Runbook

This runbook is meant to be executable by a human or another coding agent.

It demonstrates the full staged VRT flow without merging anything to `main`:

1. PR1 captures visual artifacts and manifests
2. PR2 generates and publishes canonical `main` baselines
3. PR3 hydrates published baselines, compares a PR run against them, and publishes a review site

## Branches

- PR1: `scout-vrt/pr1-local-foundation`
- PR2: `scout-vrt/pr2-main-baseline-publisher`
- PR3: `scout-vrt/pr3-pr-compare-reporting`

## Current Reference SHAs

- PR1: `82b197094b3b`
- PR2: `7abc6d591efe`
- PR3: `60eb2cd60f23`

## Prerequisites

- Kibana repo is bootstrapped:
  - `yarn kbn bootstrap`
- You can push branches and open draft PRs
- For the full CI demo, you can manually trigger Buildkite on a branch
- For the full remote-baseline demo, the publisher environment can authenticate to:
  - `gs://ci-artifacts.kibana.dev`

## Recommended PR Setup

Open these as stacked draft PRs:

1. `scout-vrt/pr1-local-foundation` -> `main`
2. `scout-vrt/pr2-main-baseline-publisher` -> `scout-vrt/pr1-local-foundation`
3. `scout-vrt/pr3-pr-compare-reporting` -> `scout-vrt/pr2-main-baseline-publisher`

This keeps review scope aligned with the rollout:

- PR1: capture-only foundation
- PR2: baseline generation and publication
- PR3: comparison, reporting, and review site

## Baseline Terms

- Local run artifacts:
  - `.scout/test-artifacts/vrt/<runId>/...`
- Local baseline cache:
  - `.scout/baselines/vrt/...`
- Published baseline catalog:
  - `gs://ci-artifacts.kibana.dev/vrt/baselines/main/latest/index.json`
- Published expanded bundle:
  - `gs://ci-artifacts.kibana.dev/vrt/baselines/main/latest/<relativePath>/...`
- Published bundle archive:
  - `gs://ci-artifacts.kibana.dev/vrt/baselines/main/latest/<relativePath>.tar.gz`

PR3 compare prefers the archive when present and falls back to the expanded bundle directory if needed.

## Step 0: Clean Starting Point

Use the aggregate PR3 branch for local dry runs unless you are specifically validating an intermediate PR.

```bash
git switch scout-vrt/pr3-pr-compare-reporting
rm -rf .scout/test-artifacts/vrt
rm -rf .scout/baselines/vrt
```

If you want to preserve earlier artifacts, skip the `rm -rf` commands.

## Step 1: Local Validation

Run this before any demo or CI exercise:

```bash
env JEST_USE_WATCHMAN=0 yarn test:jest src/platform/packages/shared/kbn-scout-vrt --watchman=false
yarn test:type_check --project src/platform/packages/shared/kbn-scout-vrt/tsconfig.json
node scripts/check_changes.ts
```

Expected result:

- Jest passes
- type-check passes
- `check_changes` passes

## Step 2: Pick a Small VRT-Enabled Config

Use a small config for the demo. A good default is:

- `src/platform/plugins/private/advanced_settings/test/scout/ui/playwright.config.ts`

All commands below assume that config.

## Step 3: PR1 Demo, Capture Artifacts Only

Switch to PR1 if you want to validate the foundation in isolation:

```bash
git switch scout-vrt/pr1-local-foundation
rm -rf .scout/test-artifacts/vrt
```

Run capture mode:

```bash
node scripts/scout_vrt run-tests \
  --location local \
  --arch stateful \
  --domain classic \
  --config src/platform/plugins/private/advanced_settings/test/scout/ui/playwright.config.ts
```

Expected result:

- run manifest exists at:
  - `.scout/test-artifacts/vrt/<runId>/manifest.json`
- package manifest exists at:
  - `.scout/test-artifacts/vrt/<runId>/test-artifacts/<packageId>/manifest.json`
- captured PNGs exist under:
  - `.scout/test-artifacts/vrt/<runId>/test-artifacts/...`
- run manifest mode is `capture`

This proves PR1 can discover VRT suites, capture checkpoints, and emit the stable contract.

## Step 4: PR2 Demo, Generate Local Baselines

Switch to PR2 if you want to validate baseline generation in isolation:

```bash
git switch scout-vrt/pr2-main-baseline-publisher
rm -rf .scout/test-artifacts/vrt
rm -rf .scout/baselines/vrt
```

Run baseline generation:

```bash
node scripts/scout_vrt run-tests \
  --location local \
  --arch stateful \
  --domain classic \
  --config src/platform/plugins/private/advanced_settings/test/scout/ui/playwright.config.ts \
  --update-baselines
```

Expected result:

- baseline PNGs exist under:
  - `.scout/baselines/vrt/...`
- captured run artifacts still exist under:
  - `.scout/test-artifacts/vrt/<runId>/...`
- package manifest checkpoint status is `updated`
- run manifest mode is `update-baselines`

This proves PR2 can generate a canonical local baseline cache from the current commit.

## Step 5: PR3 Demo, Compare Against Local Baselines

Switch to PR3 if needed:

```bash
git switch scout-vrt/pr3-pr-compare-reporting
```

Run compare mode:

```bash
node scripts/scout_vrt run-tests \
  --location local \
  --arch stateful \
  --domain classic \
  --config src/platform/plugins/private/advanced_settings/test/scout/ui/playwright.config.ts \
  --compare-baselines
```

Expected result when nothing changed:

- run passes
- package manifest checkpoint status is `passed`
- no diff image is produced

To force a visible mismatch for the demo:

1. Make a small visual change in the UI under test
2. Rerun the exact same command above

Expected mismatch result:

- package manifest checkpoint status is `failed`
- `diffPath` is present
- `mismatchPercent` is present
- diff image exists under:
  - `.scout/test-artifacts/vrt/<runId>/test-artifacts/...`

To force a missing-baseline case:

1. Delete one baseline PNG from `.scout/baselines/vrt/...`
2. Rerun the compare command

Expected missing-baseline result:

- checkpoint status is `missing-baseline`
- the run fails with a clear error

## Step 6: Seed Remote Baselines for a Real PR3 CI Demo

PR3 CI cannot run end-to-end from a cold start. It needs the remote baseline catalog and assets created by PR2.

### Recommended Path: Manual Buildkite Run of PR2

Trigger a manual Buildkite build against:

- branch: `scout-vrt/pr2-main-baseline-publisher`

The important step is:

- label: `Publish Main VRT Baselines`

That step is defined in:

- `.buildkite/pipelines/on_merge.yml`

It runs:

- `.buildkite/scripts/steps/scout_vrt/publish_main_baselines.sh`

That in turn runs:

- `.buildkite/scripts/steps/scout_vrt/publish_main_baselines.ts`

### What This Step Does

It:

1. regenerates Scout config discovery
2. finds all VRT-enabled Scout configs
3. runs `--update-baselines` per target group
4. stages bundles under:
   - `location/arch/domain/browser/viewport`
5. publishes both:
   - expanded directories
   - sibling `tar.gz` archives
6. writes and publishes the catalog:
   - `commits/<sha>/index.json`
   - `latest/index.json`

### Expected Remote Outputs

Examples:

- `gs://ci-artifacts.kibana.dev/vrt/baselines/main/commits/<sha>/index.json`
- `gs://ci-artifacts.kibana.dev/vrt/baselines/main/latest/index.json`
- `gs://ci-artifacts.kibana.dev/vrt/baselines/main/latest/local/stateful/classic/chromium/1440x900/manifest.json`
- `gs://ci-artifacts.kibana.dev/vrt/baselines/main/latest/local/stateful/classic/chromium/1440x900.tar.gz`

### Verify the Publish Worked

Use `gcloud storage ls` or equivalent:

```bash
gcloud storage ls gs://ci-artifacts.kibana.dev/vrt/baselines/main/latest/
gcloud storage cat gs://ci-artifacts.kibana.dev/vrt/baselines/main/latest/index.json | head
```

Confirm:

- `index.json` exists
- bundle entries include:
  - `relativePath`
  - `manifestPath`
  - `archivePath`
- at least one archive object exists:
  - `<relativePath>.tar.gz`

### Bespoke Local Publisher Alternative

If you cannot run the Buildkite pipeline but you do have GCS access and a built Kibana install directory, run the PR2 publisher script directly.

On `scout-vrt/pr2-main-baseline-publisher`:

```bash
export BUILDKITE_BUILD_ID=manual-$(date +%s)
export BUILDKITE_COMMIT=$(git rev-parse HEAD)
export KIBANA_BUILD_LOCATION=/absolute/path/to/kibana/build/install
.buildkite/scripts/steps/scout_vrt/publish_main_baselines.sh
```

This is the closest local equivalent to the real PR2 CI seed step.

Important:

- `KIBANA_BUILD_LOCATION` must point to a built install directory suitable for Scout runs
- you still need auth that can upload to `gs://ci-artifacts.kibana.dev`

## Step 7: Run the Real PR3 CI Demo

Once the remote baseline is seeded:

1. push `scout-vrt/pr3-pr-compare-reporting`
2. open or update the draft PR
3. add the label:
   - `ci:vrt`

That label causes the PR pipeline generator to include:

- `.buildkite/pipelines/pull_request/vrt.yml`

The step label is:

- `Run VRT Compare`

It runs:

- `.buildkite/scripts/steps/scout_vrt/run_pr_vrt_compare.sh`

## Step 8: What PR3 CI Should Do

The PR3 CI flow should:

1. download:
   - `gs://ci-artifacts.kibana.dev/vrt/baselines/main/latest/index.json`
2. find matching bundles for the target under test
3. prefer downloading the single-file archive:
   - `<relativePath>.tar.gz`
4. extract that archive
5. hydrate `.scout/baselines/vrt/...`
6. run:
   - `node scripts/scout_vrt run-tests --compare-baselines ...`
7. build and publish the static review site
8. annotate Buildkite and comment on the PR

Expected review site URL shape:

- `https://ci-artifacts.kibana.dev/vrt/pr/<pr-number>/<build-id>/index.html`

## Step 9: Demo Scenarios for the Team

### Scenario A: Clean Compare

- seed baselines from PR2
- run PR3 with `ci:vrt`
- expect:
  - compare passes
  - review site exists
  - no diff-heavy failure summary

### Scenario B: Intentional Visual Drift

- make one small visual change
- rerun PR3 with `ci:vrt`
- expect:
  - failed checkpoint(s)
  - diff image(s)
  - review site shows baseline vs actual vs diff

### Scenario C: Missing Baseline

- easiest locally:
  - remove one file under `.scout/baselines/vrt/...`
  - rerun compare mode
- or seed an intentionally incomplete remote baseline set
- expect:
  - `missing-baseline`
  - clear failure mode

### Scenario D: Idempotence

Rerun the exact same labeled PR build with no code changes.

Expected:

- same pass/fail outcome
- same checkpoint counts
- only build-specific metadata changes, such as build ID and site URL

## Step 10: Success Criteria

You can consider the demo successful if all of the following are true:

- PR1 captures artifacts and manifests locally
- PR2 generates local baselines and can publish the remote baseline catalog
- PR2 publishes both expanded bundles and bundle archives
- PR3 downloads the published catalog
- PR3 hydrates baselines, preferring the archive path
- PR3 runs compare mode and produces a review site
- PR3 reruns are idempotent

## Troubleshooting

### PR3 fails before compare starts

Likely cause:

- no seeded remote baseline catalog exists yet

Check:

- `gs://ci-artifacts.kibana.dev/vrt/baselines/main/latest/index.json`

### PR3 downloads baselines slowly

Check whether the catalog entry includes `archivePath`.

If not:

- PR3 will fall back to directory sync
- reseed baselines with the updated PR2 branch

### PR2 local publisher fails

Check:

- `KIBANA_BUILD_LOCATION` is valid
- service-account auth to GCS works
- Scout can discover VRT-enabled configs

### Local compare says `missing-baseline`

You probably skipped the local baseline generation step.

Run:

```bash
node scripts/scout_vrt run-tests \
  --location local \
  --arch stateful \
  --domain classic \
  --config src/platform/plugins/private/advanced_settings/test/scout/ui/playwright.config.ts \
  --update-baselines
```

## Notes for Future Automation

- PR2 is the first place where baseline publication exists
- PR3 is the first place where baseline hydration and compare exist
- the review site is a viewer only; comparison happens before the site is built
- archive publication is additive; older expanded-only bundles still work because PR3 falls back to directory sync
