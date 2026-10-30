---
navigation_title: Run tests
---

# Run Scout tests [scout-run-tests]

:::::::{tip}
The commands below work the same way for both UI and API tests.
:::::::

::::::{note}
The examples use `<plugin-path>/test/scout/ui/playwright.config.ts`. If your plugin organizes tests into [namespaces](./setup-scout.md#scout-namespaces), point at the namespaced config instead, for example `<plugin-path>/test/scout/<namespace>/ui/playwright.config.ts`.
::::::

## Local runs [scout-run-tests-local]

Scout requires Kibana and Elasticsearch to be running before running tests against a **local deployment**.

::::::{stepper}

:::::{step} Start servers once

Start the Kibana and Elasticsearch servers once:

```bash
node scripts/scout start-server \
  --arch <stateful|serverless> \
  --domain <classic|search|observability_complete|observability_logs_essentials|security_complete|security_essentials|security_ease|vectordb>
```

:::::

:::::{step} Run tests as often as you'd like (in a separate terminal)

And then run tests how often you'd like against the same test servers:

```bash
node scripts/playwright test --config <plugin-path>/test/scout/ui/playwright.config.ts \
  --project local \
  --grep @<location>-<arch>-<domain>
```

- Use `--project local` to target your locally running Kibana/Elasticsearch processes.
- Use `--grep` to filter by tag (for example `@local-stateful-classic`). If you omit `--grep`, Playwright will run all suites in the config, including ones that may not be compatible with your target.
- [Limit tags](./deployment-tags.md#scout-deployment-tags-limit) are not applied when calling Playwright directly. Use `--grep-invert` to skip the suites whose limit tags don't match your environment, for example `--grep-invert @limit/only-<attribute>` for an attribute your environment doesn't have.

We recommend checking out Playwright's [**UI mode**](./debugging.md#playwright-ui-mode) (use `--ui`).

:::::
::::::::

### Alternative: one command to start servers + run tests [scout-run-tests-cli]

```bash
node scripts/scout run-tests \
  --arch <stateful|serverless> \
  --domain <classic|search|observability_complete|observability_logs_essentials|security_complete|security_essentials|security_ease|vectordb> \
  --config <plugin-path>/test/scout/ui/playwright.config.ts
```

When Scout starts Kibana and Elasticsearch locally, it saves the server configuration to `.scout/servers/local.json` and later reads it when running tests.

### Run a subset with `--testFiles` [scout-run-tests-testFiles]

Directory:

```bash
node scripts/scout run-tests \
  --arch <stateful|serverless> \
  --domain <domain> \
  --testFiles <plugin-path>/test/scout/ui/tests/some_dir
```

Comma-separated file list:

```bash
node scripts/scout run-tests \
  --arch <stateful|serverless> \
  --domain <domain> \
  --testFiles <path/to/one.spec.ts>,<path/to/two.spec.ts>
```

:::::::{warning}
All `--testFiles` paths must fall under the same Scout root (for example, `scout/ui/tests` vs `scout/ui/parallel_tests`) so Scout can discover the right config.
:::::::

### Declare target attributes with `--targetAttribute` [scout-run-tests-target-attributes]

[Limit tags](./deployment-tags.md#scout-deployment-tags-limit) are only honored when the run declares the **target attributes** of the environment it runs against. Declare them so that `limit.only` suites for those attributes run and `limit.except` suites are skipped:

```bash
node scripts/scout run-tests \
  --arch <stateful|serverless> \
  --domain <domain> \
  --targetAttribute <attribute> \ <1>
  --config <plugin-path>/test/scout/ui/playwright.config.ts
```

1. For example `fips`, for a Kibana running in FIPS mode.

`--targetAttribute` is repeatable and accepts comma-separated values. When omitted, Scout reads the `SCOUT_TARGET_ATTRIBUTES` environment variable instead. Without either, Scout assumes the environment has no attributes and skips every `limit.only` suite.

::::::{note}
Declaring an attribute doesn't change how Scout starts the servers: it tells Scout what the environment is but doesn't make it so.
::::::

### Custom server configuration [scout-run-tests-server-config-set]

By default, Scout starts Kibana and Elasticsearch using the built-in `default` configuration set. This works for most tests and requires no extra flags. Because all suites that use the default config share the same servers, they can be grouped together in CI, saving both time and resources.

If your tests need specific server-level settings that must be present at boot time (for example, feature flags that cannot be toggled at runtime), use a **custom configuration set**. With `start-server`, select it using `--serverConfigSet`. Each custom config set requires its own dedicated server instance, so prefer [runtime feature flags](./feature-flags.md#scout-feature-flags-runtime) whenever possible.

```bash
node scripts/scout start-server \
  --arch stateful \
  --domain classic \
  --serverConfigSet evals_entity_analytics
```

With `run-tests`, Scout detects the configuration set from the `test/scout_<name>/` directory in the Playwright config path:

```bash
node scripts/scout run-tests \
  --arch stateful \
  --domain classic \
  --config <plugin-path>/test/scout_evals_entity_analytics/ui/playwright.config.ts
```

See [Feature flags](./feature-flags.md#scout-feature-flags-custom-servers) for more details on when and how to use custom server configurations.
