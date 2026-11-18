# `connector_emulator` server config set

Boots the stateful Kibana and Elasticsearch test servers with Kibana's connector requests going through the [connector emulator](../../../../../../kbn-connector-emulate/README.md), which stands in for the vendors, so a Scout suite can run connector actions through the actions API without credentials.

## Why it needs its own set

`xpack.actions.proxyUrl` and the trust for the emulator's CA can only be set when Kibana starts, so a suite can't toggle them at runtime on the `default` set. The set changes nothing else.

| What                                         | Value                                                                                                                                                               |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--xpack.actions.proxyUrl`                   | where the emulator listens, `http://127.0.0.1:5690` by default                                                                                                      |
| `NODE_EXTRA_CA_CERTS` (Kibana's environment) | the emulator's `ca.crt`, `data/connector_emulate/ca.crt` by default, so Kibana trusts it for every vendor host, including hosts that come from a connector's config |

`node scripts/connector_emulate` asks the same function for its defaults (`resolveEmulatorLocation` in `@kbn/connector-emulate`), so the two agree. To move the emulator, set `KBN_CONNECTOR_EMULATOR_PORT`, `KBN_CONNECTOR_EMULATOR_HOST` or `KBN_CONNECTOR_EMULATOR_CA_DIR` for both.

## Running

The emulator creates its CA the first time it runs, and Node reads `NODE_EXTRA_CA_CERTS` when Kibana starts, so start the emulator first:

```sh
node scripts/connector_emulate --all
node scripts/scout start-server --arch stateful --domain classic --serverConfigSet connector_emulator
node scripts/scout run-tests --arch stateful --domain classic --config <suite>/playwright.config.ts
```

`run-tests` picks this set up from a suite under a `test/scout_connector_emulator` folder. A suite that finds Kibana doesn't trust the emulator (TLS errors from the actions API) was started before the emulator created its CA: restart the Scout servers.

Two suites use this set, both for Firecrawl:

- [`kbn-connector-specs/test/scout_connector_emulator/api`](../../../../../../kbn-connector-specs/test/scout_connector_emulator/api/tests/firecrawl_actions.spec.ts) runs each of its actions through the actions API, with no browser.
- [`workflows_management/test/scout_connector_emulator/ui`](../../../../../../../../plugins/shared/workflows_management/test/scout_connector_emulator/ui/parallel_tests/firecrawl_workflow.spec.ts) writes a workflow with a step per action in the Workflows app, saves and runs it, and checks the steps' outputs and what the emulator saw. To watch it in a browser, start the emulator and the Scout servers as above, then run it headed:

  ```sh
  node scripts/playwright test --config src/platform/plugins/shared/workflows_management/test/scout_connector_emulator/ui/parallel.playwright.config.ts --project local --headed
  ```

  The suite sets realistic Firecrawl responses on the emulator for its run. For a demo, start the emulator with `--log-responses` to see what it answers each request with, and set `CONNECTOR_EMULATOR_DEMO_PAUSE_SECONDS`: the workflow then waits that long after each step, and the test stays that long on each step's result once it has completed, so you can read it.

  ```sh
  CONNECTOR_EMULATOR_DEMO_PAUSE_SECONDS=4 node scripts/playwright test --config src/platform/plugins/shared/workflows_management/test/scout_connector_emulator/ui/parallel.playwright.config.ts --project local --headed
  ```

In CI, the `Connector Emulator Scout` step runs it (`.buildkite/scripts/steps/test/connector_emulator_scout.sh`): on pull requests that change `kbn-connector-specs`, `kbn-connector-emulate` or this set, and weekly in the connector pipeline, with the committed vendor specs and with the vendors' latest ones. The step starts the emulator for the connectors it lists, so add a connector there when adding a suite for it. The Scout lanes don't run this package's suites, as they have no emulator.

## Running tests in parallel

One Kibana sends its requests through one emulator, so tests share its calls and its runtime fixtures.

- **Tests on different connectors may run in parallel**, as long as each scopes what it reads and changes to its connector: `createEmulatorControl(proxyUrl, { connector: 'firecrawl' })`, or `?connector=firecrawl` on the control endpoints. The emulator's name for a connector is its id without the dot.
- **Tests on the same connector that set fixtures, read calls or reset must run serially**, for example in one Playwright project, or one `describe.serial` block, per connector. API tests run serially by default.

The full rule is in the emulator's README, under "Running tests in parallel".
