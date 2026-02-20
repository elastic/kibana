---
navigation_title: Set up plugin
---

# Set up Scout in your plugin or package [scout-setup-plugin]

This page shows the **minimum setup** to add Scout tests to a plugin/package. For choosing the right import (`@kbn/scout` vs solution packages), see [Scout packages](../scout.md#scout-packages).

## Guided setup with the Scout CLI [scout-setup-cli]

Generate a working scaffold (folders, configs, and sample tests):

```bash
node scripts/scout.js generate
```

Then, [enable your plugin or package](#enable-scout-tests-in-ci) in the CI.

## Manual setup [scout-setup-manual]

### 1. Create the folder layout [scout-setup-folders]

Create `test/scout`:

```text
your-plugin/
└── test/
    └── scout/
        ├── ui/      # UI tests (optional)
        ├── api/     # API tests (optional)
        └── common/  # shared code (optional)
```

### 2. Add Playwright config(s) [scout-setup-config]

Create `playwright.config.ts` under `test/scout/ui` and/or `test/scout/api`:

```ts
import { createPlaywrightConfig } from '@kbn/scout';

export default createPlaywrightConfig({
  testDir: './tests',
});
```

::::::{important}
Name the file exactly `playwright.config.ts` so Scout tooling can discover it.
::::::

Then create the `tests/` directory next to the config.

### 3. (Optional) Add a parallel UI config [scout-setup-parallel-config]

If your UI suites can be isolated, add `parallel.playwright.config.ts` under `test/scout/ui` and point it at `parallel_tests/`:

```ts
import { createPlaywrightConfig } from '@kbn/scout';

export default createPlaywrightConfig({
  testDir: './parallel_tests',
  workers: 2,
});
```

::::::{important}
Name the file exactly `parallel.playwright.config.ts` so Scout tooling can discover it.
::::::

See [Parallelism](./parallelism.md) and [Global setup hook](./global-setup-hook.md) for recommended parallel patterns.

### 4. Enable tests in CI

Finally, [enable Scout test runs in the CI](#enable-scout-tests-in-ci) for your plugin or package.

## Enable Scout tests in CI [enable-scout-tests-in-ci]

To enable Scout CI for your plugin/package, add it to `.buildkite/scout_ci_config.yml`:

```yaml
plugins:
  enabled:
    - <your_plugin_name>
  disabled:

packages:
  enabled:
    - <your_package_name>
  disabled:
```
