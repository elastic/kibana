---
navigation_title: Set up plugin
---

# Set up Scout in your plugin or package [scout-setup-plugin]

This page shows the **minimum setup** to add Scout tests to a plugin/package. For choosing the right import (`@kbn/scout` vs solution packages), see [Scout packages](./scout.md#scout-packages).

## Guided setup with the Scout CLI [scout-setup-cli]

:::::::::::{stepper}

::::::::::{step} Generate a working scaffold

Generate a working scaffold (folders, configs, and sample tests) by following the guided setup:

```bash
node scripts/scout.js generate
```

This command will also automatically enable your plugin or package's Scout tests in the CI by updating the `.buildkite/scout_ci_config.yml` file.

::::::::::

::::::::::{step} Write and run tests

Tweak the new Playwright config(s) and [write UI tests](./write-ui-tests.md) or [API tests](./write-api-tests.md).

::::::::::

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

:::::::{tip}
Large plugins often accumulate tests across different functional areas, sometimes owned by different teams. Rather than placing them all directly under the Scout root, group them into functional-area [namespaces](#scout-namespaces) and assign ownership per area.
:::::::

::::::::

::::::::{step} Create Playwright config(s)

Create a config under `test/scout/ui` and/or `test/scout/api`.

::::::::{tab-set}

:::::::{tab-item} Standard config (sequential test runs)

Create `playwright.config.ts`:

```ts
import { createPlaywrightConfig } from '@kbn/scout';

export default createPlaywrightConfig({
  testDir: './tests',
});
```

::::::{important}
Use the conventional name `playwright.config.ts` so Scout tooling can discover the config.
::::::

Then create the `tests/` directory next to the config.

If many files share one-time setup (archives/ingest/settings), add a [global setup hook](./global-setup-hook.md).

:::::::

:::::::{tab-item} Parallel config (parallel test runs)

If your UI suites can be isolated, add `parallel.playwright.config.ts` under `test/scout/ui` and point it at `parallel_tests/`:

```ts
import { createPlaywrightConfig } from '@kbn/scout';

export default createPlaywrightConfig({
  testDir: './parallel_tests',
  workers: 2,
});
```

::::::{important}
Use the conventional name `parallel.playwright.config.ts` so Scout tooling can discover the config.
::::::

Then create the `parallel_tests/` directory next to the config. For parallel suites, prefer defining test suites and test cases using `spaceTest` so each worker runs in an isolated Space (see [Parallelism](./parallelism.md)).

If many files share one-time setup (archives/ingest/settings), add a [global setup hook](./global-setup-hook.md).

:::::::

::::::::

::::::::

::::::::{step} Enable Scout runs in CI

Ensure your plugin or package is listed in `.buildkite/scout_ci_config.yml` so Scout tests run in CI. If not already in the list, add **one line** under the appropriate `enabled` list:

- **Plugins**: Add `- <plugin_name>` under `plugins.enabled`. The name is the path segment(s) after `plugins/` (the plugin folder name, or a slash-separated path for nested plugins).
- **Packages**: Add `- <package_name>` under `packages.enabled`. The name is the folder name after `packages/`.

```yaml
plugins:
  enabled:
    - <plugin_name>
  disabled:

packages:
  enabled:
    - <package_name>
  disabled:
```

::::::::

::::::::::{step} Write and run tests

Tweak the new Playwright config(s) and [write UI tests](./write-ui-tests.md) or [API tests](./write-api-tests.md).

::::::::::

:::::::::

## Organize large plugins with namespaces [scout-namespaces]

By default, a plugin keeps all of its Scout tests directly under the Scout root (`test/scout/{ui,api}/`). Large plugins can instead group tests into **namespaces** (single-level sub-directories named after a functional area):

```text
your-plugin/
└── test/
    └── scout/
        ├── detection_engine/    # namespace
        │   ├── ui/
        │   └── api/
        ├── entity_analytics/    # namespace
        │   └── ui/
        └── common/              # shared code (optional, reserved name)
```

A namespace holds the same layout you'd otherwise place at the Scout root, one level deeper, with its own Playwright config(s), fixtures, and tests (for example `test/scout/<namespace>/ui/playwright.config.ts`).

**Why use namespaces?**

- **Scoped ownership**: assign each area to the team that owns it in `.github/CODEOWNERS`, so failures reach the smaller group that maintains that functionality.
- **Run a focused subset**: point Scout at a single namespace's config to run (or re-run) only that area's tests, instead of the whole plugin's suite.
- **Independently runnable in CI**: each namespace is discovered as its own config, so selective testing and CI reporting are scoped per area, while all namespaces still share the same [server configuration](./run-scout-tests.md#scout-run-tests-server-config-set).

### Generate a namespace [scout-namespaces-generate]

Pass `--namespace` to the [Scout CLI](#scout-setup-cli):

```bash
node scripts/scout.js generate \
  --path x-pack/solutions/security/plugins/security_solution \
  --namespace detection_engine
```

In interactive mode, if the plugin already uses namespaces, the generator lists the existing ones so you can pick one or create a new one. After scaffolding, it reminds you to set the namespace owner in `.github/CODEOWNERS`:

```text
/x-pack/solutions/security/plugins/security_solution/test/scout/detection_engine/ @elastic/<team>
```

### Rules [scout-namespaces-rules]

::::::{important}
- **One level only**: use `test/scout/<namespace>/{ui,api}/` (deeper nesting such as `.../<area>/<sub-area>/{ui,api}/` is not supported).
- **Don't mix layouts**: a Scout root is either entirely root-level (`test/scout/{ui,api}/`) or entirely namespace-based. Mixing the two fails the build. To adopt namespaces in an existing plugin, migrate the root-level tests into a namespace first.
- **Naming**: start with a lowercase letter and use only lowercase letters, digits, and underscores. `ui`, `api`, `.meta`, and `common` are reserved (`common` is a plain shared-utilities directory with no Playwright config).
::::::
