---
navigation_title: Feature flags
---

# Feature flags [scout-feature-flags]

Some Kibana features are gated behind feature flags or experimental configuration. Scout provides two ways to enable them: **at runtime** via feature flags (without restarting the server) and **at server startup** (via custom server configurations).

## When to use runtime vs server-level flags [scout-feature-flags-when-to-use]

- **Runtime** (`apiServices.core.settings()`): **preferred** for most feature flags. No server restart, flags can be toggled per suite, and your tests keep sharing the default servers with other suites in CI.
- **Server startup** (custom config `serverArgs`): only when the setting must be present at boot time or is not supported by the runtime settings API.

## Enabling feature flags at runtime [scout-feature-flags-runtime]

Use `apiServices.core.settings()` to toggle feature flags while the server is running. This calls Kibana's internal [config overrides API](https://docs.elastic.dev/kibana-dev-docs/tutorials/feature-flags-service#config-overrides) (Elasticians only). Changes take effect immediately (no restart needed).

::::::{note}
Feature flag overrides are **server-wide**: they apply to the entire Kibana instance, not to a single space or worker. In [parallel suites](./parallelism.md) all workers share the same server, so a flag set by one worker is visible to every other worker. For parallel tests, enable flags in the **[global setup hook](./global-setup-hook.md)** so they are set once before any worker starts.
::::::

### In a global setup hook (recommended for parallel suites) [scout-feature-flags-global-setup]

Enable the flag once in `global.setup.ts` before any worker starts:

```ts
import { globalSetupHook } from '@kbn/scout';

globalSetupHook('Enable feature flags', async ({ apiServices, log }) => {
  log.info('[setup] Enabling my-feature-flag...');
  await apiServices.core.settings({
    'feature_flags.overrides': {
      'my-plugin.my-feature-flag': 'true',
    },
  });
});
```

### In a test suite (sequential tests) [scout-feature-flags-test-suite]

For sequential suites you can enable flags in `beforeAll` and reset them in `afterAll`:

```ts
import { tags } from '@kbn/scout';
import { test } from '../fixtures';

test.describe('Browse integration', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ apiServices }) => {
    await apiServices.core.settings({
      'xpack.fleet.experimentalFeatures': { newBrowseIntegrationUx: true },
    });
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.core.settings({
      'xpack.fleet.experimentalFeatures': { newBrowseIntegrationUx: false },
    });
  });

  test('loads the page', async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
    // ...
  });
});
```

When using `feature_flags.overrides`, the keys must match the feature flag IDs registered by the owning plugin in Kibana core.

## Custom server configs (reach out to AppEx QA first) [scout-feature-flags-custom-servers]

Some settings cannot be changed at runtime and must be present when Kibana starts. For these cases Scout supports **custom server configuration sets**.

::::::{warning}
⚠️ Each custom config set requires its own dedicated server instance, which adds CI cost. **Reach out to the AppEx QA team before creating one** to make sure it is the right approach for your use case.
::::::

### How custom configs work [scout-feature-flags-custom-configs-how]

By default, Scout starts servers using the `default` configuration set. Custom configs live under:

```text
src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets/<name>/
```

Inside that directory, create one config file per architecture + domain combination your tests target. Files follow the naming convention `<domain>.<arch>.config.ts` and must export `servers: ScoutServerConfig`.

Scout detects a custom config in two ways:

1. **Path convention**: name your test directory `test/scout_<name>/` instead of `test/scout/` and Scout automatically maps it to the `<name>` config set.
2. **Explicit flag**: pass `--serverConfigSet <name>` when starting the server.

### Example [scout-feature-flags-custom-config-example]

The `uiam_local` config set extends the default serverless config to enable UIAM authentication with a mock IdP:

```ts
import { servers as defaultConfig } from '../../default/serverless/security_complete.serverless.config';
import type { ScoutServerConfig } from '../../../../../types';

export const servers: ScoutServerConfig = {
  ...defaultConfig,
  esServerlessOptions: { uiam: true },
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      '--xpack.security.uiam.enabled=true',
      '--xpack.security.uiam.url=<mock-idp-url>',
      // ... additional UIAM-specific args
    ],
  },
};
```

[Start the server](./run-tests.md#scout-run-tests-server-config-set) with the custom config:

```bash
node scripts/scout.js start-server --arch serverless --domain security_complete --serverConfigSet uiam_local
```
