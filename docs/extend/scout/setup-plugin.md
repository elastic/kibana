---
navigation_title: Set up plugin
---

# Set up Scout in your plugin or package [scout-setup-plugin]

This guide explains how to integrate Scout into your plugin or package. While we refer to “plugins” throughout, the same steps apply to packages.

:::::{warning}
In general, platform plugins should import from `@kbn/scout`, while solution plugins should import from the respective `@kbn/scout-<solution>` package.
:::::

## Guided setup with the Scout CLI [scout-setup-cli]

The Scout CLI can scaffold the required files and folders (and sample UI/API tests) for you.

```bash
node scripts/scout.js generate
```

The final step is enabling Scout tests in CI. See [Enable Scout tests in CI](#enable-scout-tests-in-ci).

## Manual setup [scout-setup-manual]

### Create folders to store tests and shared resources [scout-setup-folders]

Create a `test/scout` folder tree in your plugin/package:

```text
your-plugin/
└── test/
    └── scout/
        ├── ui/
        ├── api/
        └── common/
```

- `ui`: functional (UI) tests (create only if your plugin has UI tests)
- `api`: API tests (create only if your plugin has server-side routes)
- `common`: shared code like constants/fixtures (create only if needed by both UI and API tests)

:::::{tip}
For a real example, see the `painless_lab` plugin’s Scout tests in the repository:

- `https://github.com/elastic/kibana/tree/main/x-pack/platform/plugins/private/painless_lab/test/scout`
:::::

### Create a Playwright config for UI and/or API tests [scout-setup-config]

Inside `ui` and/or `api`, create `playwright.config.ts` using `createPlaywrightConfig`:

```ts
import { createPlaywrightConfig } from '@kbn/scout'; <1>

export default createPlaywrightConfig({
  testDir: './tests', <2>
});
```

1. Import from `@kbn/scout-oblt` or `@kbn/scout-security` if your plugin belongs to a specific solution.
2. The `tests` folder is created next. The path must match `testDir`.

:::::{warning}
Name this file exactly `playwright.config.ts` so tooling can discover it.
:::::

Create the `tests` folder(s) referenced by `testDir`:

```text
your-plugin/
└── test/
    └── scout/
        ├── ui/
        │   ├── tests/
        │   └── playwright.config.ts
        └── api/
            ├── tests/
            └── playwright.config.ts
```

### (Optional) Add a config for parallel UI runs [scout-setup-parallel-config]

Parallel test runs are optional, but recommended when tests can be isolated. See [Parallelism](./parallelism.md).

Create `parallel.playwright.config.ts` in `ui` (and only in `api` if/when API parallelism is supported for your use case):

```ts
import { createPlaywrightConfig } from '@kbn/scout'; <1>

export default createPlaywrightConfig({
  testDir: './parallel_tests', <2>
  workers: 2, <3>
});
```

1. Import from `@kbn/scout-oblt` or `@kbn/scout-security` if your plugin belongs to a specific solution.
2. You will create `parallel_tests` next.
3. Scout allows a maximum of 3 Playwright workers (to reduce load on the shared cluster).

:::::{warning}
Name this file exactly `parallel.playwright.config.ts` so tooling can discover it.
:::::

Create the `parallel_tests` folder(s) referenced by `testDir`:

```text
your-plugin/
└── test/
    └── scout/
        ├── ui/
        │   ├── tests/
        │   ├── parallel_tests/
        │   ├── playwright.config.ts
        │   └── parallel.playwright.config.ts
        └── api/
            ├── tests/
            └── playwright.config.ts
```

## Enable Scout tests in CI [enable-scout-tests-in-ci]

To enable Scout CI for your plugin/package, add it to `.buildkite/scout_ci_config.yml`:

```yaml
# Define which plugins should be run or skipped in Scout CI pipeline
plugins:
  enabled:
    - apm
    - <your_plugin_name>
  disabled:

packages:
  enabled:
    - kbn-streamlang-tests
  disabled:
```

:::::{note}
The original internal doc includes Buildkite screenshots. Those images aren’t in this repo copy; for screenshots and internal pipeline details, see internal AppEx QA documentation.
:::::

