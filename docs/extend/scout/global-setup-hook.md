---
navigation_title: Global setup hook
---

# Global setup hook [scout-global-setup-hook]

The global setup hook lets you run code **exactly once** before any Scout tests execute, regardless of how many workers are configured. This is useful for one-time setup tasks, including:

- Importing Elasticsearch archives with the `esArchiver` fixture
- Updating Kibana settings via the `kbnClient` fixture
- Enabling an experimental plugin's API

:::::{note}
There is currently no global teardown hook in Scout. In most cases, teardown is redundant because the test environment is shut down after tests complete.
:::::

The global setup hook is especially useful for [parallel test suites](./parallelism.md): when multiple workers are configured, the first worker executes the setup once and all other workers wait for it to complete.

:::::{warning}
We assume you have [set up your plugin or package](./setup-plugin.md) to work with Scout.
:::::

:::::{note}
Global setup hook vs `beforeAll`:

- Global setup hook runs **once in total** (executed by the first worker if multiple workers are configured).
- `beforeAll` runs **once per test file per worker**.
:::::

## Enable the global setup hook [enable-global-setup-hook]

### 1. Update your Playwright config [global-setup-config]

Set `runGlobalSetup: true` in your Playwright config file:

```ts
import { createPlaywrightConfig } from '@kbn/scout'; <1>

export default createPlaywrightConfig({
  testDir: './parallel_tests/', <2>
  workers: 2, // optional
  runGlobalSetup: true, <3>
});
```

1. Import from `@kbn/scout-oblt` or `@kbn/scout-security` if your plugin belongs to a specific solution.
2. The directory containing your test files.
3. Enables the global setup hook.

### 2. Create the global setup hook file [global-setup-file]

Create a `global.setup.ts` file in the same directory specified by `testDir` (for example, `./parallel_tests/`):

```text
your-plugin/
└── test/
    └── scout/
        └── ui/
            ├── parallel_tests/
            │   ├── global.setup.ts
            │   ├── feature_a.spec.ts
            │   └── feature_b.spec.ts
            └── parallel.playwright.config.ts
```

Scout will automatically find and execute this file before running any tests.

### 3. Write your setup code in `global.setup.ts` [global-setup-code]

Example 1: loading Elasticsearch archives:

```ts
import { globalSetupHook } from '@kbn/scout'; <1>

globalSetupHook('Setup environment for Discovery tests', async ({ esArchiver, log }) => {
  log.info('[setup] Loading ES archive with test data...');
  await esArchiver.loadIfNeeded('x-pack/platform/test/fixtures/es_archives/ml/farequote');
});
```

1. Import from `@kbn/scout-oblt` or `@kbn/scout-security` if your plugin belongs to a specific solution.

Example 2: enabling a plugin's API:

```ts
import { globalSetupHook } from '@kbn/scout'; <1>

globalSetupHook('Setup environment for Streams tests', async ({ apiServices, log }) => {
  log.info('[setup] Enabling Streams plugin API...');
  await apiServices.streams.enable();
});
```

1. Import from `@kbn/scout-oblt` or `@kbn/scout-security` if your plugin belongs to a specific solution.

Example 3: setting up Fleet infrastructure:

```ts
import { globalSetupHook } from '@kbn/scout'; <1>

globalSetupHook('Setup Fleet infrastructure for Profiling tests', async ({ apiServices, log }) => {
  log.info('[setup] Initializing Fleet...');

  // Initialize Fleet's internal services and agent infrastructure
  await apiServices.fleet.internal.setup();
  await apiServices.fleet.agent.setup();

  log.info('[setup] Checking if APM agent policy exists...');
  const getPolicyResponse = await apiServices.fleet.agent_policies.get({
    page: 1,
    perPage: 10,
  });

  const apmPolicyData = getPolicyResponse.data.items.find(
    (policy: { id: string }) => policy.id === 'policy-elastic-agent-on-cloud'
  );

  if (!apmPolicyData) {
    // create new agent policy...
  } else {
    log.info('[setup] APM agent policy already exists, skipping creation');
  }

  log.info('[setup] Fleet infrastructure ready');
});
```

1. Import from `@kbn/scout-oblt` or `@kbn/scout-security` if your plugin belongs to a specific solution.

:::::{warning}
The global setup hook does **not** have access to test-scoped fixtures like `page`, `browserAuth`, or `pageObjects`. Only worker-scoped fixtures are available.
:::::

### 4. Run your tests [global-setup-run-tests]

Run tests as usual via [Run Scout tests](./run-tests.md). The global setup hook will execute first—check console logs to verify it ran successfully.

