# Getting Started with @kbn/scout-vrt

This guide covers the first three rollout stages:

1. author a visual Scout suite
2. run VRT capture locally
3. generate local baselines
4. compare against hydrated baselines
5. inspect the resulting artifacts and manifests

This guide focuses on the local runtime loop. CI publishing and PR reporting are documented separately.

## 1. Opt a Scout Suite into VRT

Update the suite fixtures to export `visualTest` from `@kbn/scout-vrt`.

Typical pattern:

```ts
import { visualTest } from '@kbn/scout-vrt';

export { visualTest as test };
```

Then update the suite's Playwright config to use `createPlaywrightConfig` from `@kbn/scout-vrt`.

Typical pattern:

```ts
import { createPlaywrightConfig } from '@kbn/scout-vrt';

export default createPlaywrightConfig({
  /* existing Scout Playwright config */
});
```

## 2. Add Visual Checkpoints

Inside the spec, use `visualTest.step(...)` for any checkpoint you want captured.

Example:

```ts
import { test, expect } from '../fixtures';

test('renders the page', async ({ pageObjects }) => {
  await test.step('page is visible', async () => {
    await expect(pageObjects.advancedSettings.getPageTitle()).toBeVisible();
  });
});
```

Each visual step:

- runs the step body as a normal Scout step
- captures a screenshot after the step body completes
- records the checkpoint in the package manifest

## 3. Run Capture Mode

Use the VRT helper CLI to discover and run only VRT-enabled suites.

Example:

```bash
node scripts/scout_vrt run-tests \
  --location local \
  --arch stateful \
  --domain classic \
  --config src/platform/plugins/private/advanced_settings/test/scout/ui/playwright.config.ts
```

You can also run by test path:

```bash
node scripts/scout_vrt run-tests \
  --location local \
  --arch stateful \
  --domain classic \
  --testFiles src/platform/plugins/private/advanced_settings/test/scout/ui/tests
```

If you run the command without `--config` or `--testFiles`, it will:

- prompt for a VRT-enabled config in an interactive shell
- or list the discovered VRT-enabled configs otherwise

## 4. Generate Local Baselines

Use the same command with `--update-baselines` when you want to treat the current screenshots as the local baseline set for the selected suites.

Example:

```bash
node scripts/scout_vrt run-tests \
  --location local \
  --arch stateful \
  --domain classic \
  --config src/platform/plugins/private/advanced_settings/test/scout/ui/playwright.config.ts \
  --update-baselines
```

That writes baseline PNGs to:

- `.scout/baselines/vrt/<packageId>/<testKey>/<stepKey>.png`

The run manifest for that execution will record `mode: "update-baselines"`, and each checkpoint record will use `status: "updated"`.

## 5. Compare Against Baselines

Use `--compare-baselines` when the local baseline cache has already been seeded and you want to compare the current screenshots against it.

Example:

```bash
node scripts/scout_vrt run-tests \
  --location local \
  --arch stateful \
  --domain classic \
  --config src/platform/plugins/private/advanced_settings/test/scout/ui/playwright.config.ts \
  --compare-baselines
```

Expected checkpoint outcomes:

- no change:
  - `status: "passed"`
- visual diff:
  - `status: "failed"`
  - `diffPath`
  - `mismatchPercent`
- missing local baseline:
  - `status: "missing-baseline"`

Compare mode never updates the local baseline cache. It only reads from `.scout/baselines/vrt/...` and writes actual and diff artifacts under the run output tree.

## 6. Inspect the Output

After a run, inspect:

- run manifest:
  - `.scout/test-artifacts/vrt/<runId>/manifest.json`
- package manifest:
  - `.scout/test-artifacts/vrt/<runId>/test-artifacts/<packageId>/manifest.json`
- images:
  - `.scout/test-artifacts/vrt/<runId>/test-artifacts/<packageId>/<testKey>/<stepKey>.png`

The run manifest tells you:

- run mode
- run target
- package inventory
- run summary

The package manifest tells you:

- which checkpoints were captured, updated, passed, failed, or missing a baseline
- their stable `testKey`
- their shared `imagePath`
- any `diffPath` and `mismatchPercent` values from compare mode
- the source file and line that created the checkpoint

## 7. Publish Canonical `main` Baselines

Publishing to remote storage is intentionally handled by CI, not by the local runtime. The on-merge baseline publisher reruns the same baseline-update mode on merged `main`, then packages and uploads the resulting baselines plus manifests.

See [CI_INTEGRATION.md](CI_INTEGRATION.md) for:

- the Buildkite step that publishes canonical `main` baselines
- the published GCS layout
- manual seeding instructions for a branch or demo environment

## 8. Run PR Compare In CI

PR comparison is also handled by CI. A labeled PR run hydrates the latest published `main` baseline bundle, runs compare mode, and publishes a static review site.

See [CI_INTEGRATION.md](/Users/clint/Projects/kibana.worktrees/scout-vrt/src/platform/packages/shared/kbn-scout-vrt/CI_INTEGRATION.md) for:

- the `ci:vrt` PR trigger
- archive-first baseline hydration
- review-site publishing
- expected PR outputs

## 9. Recommended Validation

Before handing work off or pushing a branch:

```bash
env JEST_USE_WATCHMAN=0 yarn test:jest src/platform/packages/shared/kbn-scout-vrt --watchman=false
yarn test:type_check --project src/platform/packages/shared/kbn-scout-vrt/tsconfig.json
node scripts/check_changes.ts
```

## 10. What Comes Next

Later rollout stages add:

- release-drift reporting against the last serverless release baseline
