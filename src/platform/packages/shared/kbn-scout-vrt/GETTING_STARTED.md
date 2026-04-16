# Getting Started with @kbn/scout-vrt

This guide covers the foundation workflow:

1. author a visual Scout suite
2. run VRT capture locally
3. inspect the resulting artifacts and manifests

This stage is intentionally capture-only. Baseline generation, publication, and PR comparison are introduced in later rollout stages.

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

## 4. Inspect the Output

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

- which checkpoints were captured
- their stable `testKey`
- their shared `imagePath`
- the source file and line that created the checkpoint

## 5. Recommended Validation

Before handing work off or pushing a branch:

```bash
env JEST_USE_WATCHMAN=0 yarn test:jest src/platform/packages/shared/kbn-scout-vrt --watchman=false
yarn test:type_check --project src/platform/packages/shared/kbn-scout-vrt/tsconfig.json
node scripts/check_changes.ts
```

## 6. What Comes Next

Later rollout stages add:

- local baseline generation
- CI baseline publication
- PR comparison against published baselines
- static review-site generation
