---
navigation_title: Set up plugin
---

# Set up Scout in your plugin or package [scout-setup-plugin]

This page shows the **minimum setup** to add Scout tests to a plugin/package. For choosing the right import (`@kbn/scout` vs solution packages), see [Scout packages](../scout.md#scout-packages).

## Guided setup with the Scout CLI [scout-setup-cli]

:::::::::::{stepper}

::::::::::{step} Generate a working scaffold

Generate a working scaffold (folders, configs, and sample tests):

```bash
node scripts/scout.js generate
```

::::::::::

::::::::::{step} Enable Scout runs in CI

Then, [enable your plugin or package](#enable-scout-tests-in-ci) in the CI.

::::::::::

:::::::::::

## Manual setup [scout-setup-manual]

:::::::::{stepper}

::::::::{step} Create the folder layout

Create `test/scout`:

```text
your-plugin/
└── test/
    └── scout/
        ├── ui/      # UI tests (optional)
        ├── api/     # API tests (optional)
        └── common/  # shared code (optional)
```

::::::::

::::::::{step} Add Playwright config(s)

Create `playwright.config.ts` under `test/scout/ui` and/or `test/scout/api`:

```ts
import { createPlaywrightConfig } from '@kbn/scout';

export default createPlaywrightConfig({
  testDir: './tests',
});
```

::::::{important}
Use the conventional name `playwright.config.ts` so Scout tooling (and `node scripts/scout.js run-tests --testFiles ...`) can reliably discover/derive the config for `./tests`.
::::::

Then create the `tests/` directory next to the config.

::::::::

::::::::{step} (Optional) Add a parallel UI config

If your UI suites can be isolated, add `parallel.playwright.config.ts` under `test/scout/ui` and point it at `parallel_tests/`:

```ts
import { createPlaywrightConfig } from '@kbn/scout';

export default createPlaywrightConfig({
  testDir: './parallel_tests',
  workers: 2,
});
```

::::::{important}
Use the conventional name `parallel.playwright.config.ts` so Scout tooling (and `node scripts/scout.js run-tests --testFiles ...`) can reliably discover/derive the config for `./parallel_tests`.
::::::

See [Parallelism](./parallelism.md) and [Global setup hook](./global-setup-hook.md) for recommended parallel patterns.

::::::::

::::::::{step} Enable Scout runs in CI

Finally, [enable Scout test runs in the CI](#enable-scout-tests-in-ci) for your plugin or package.

::::::::

:::::::::

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
