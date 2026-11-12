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

The example suite is [`kbn-connector-specs/test/scout_connector_emulator`](../../../../../../kbn-connector-specs/test/scout_connector_emulator/api/tests/connector_action.spec.ts). It isn't run in CI yet: that needs a job that starts the emulator, which Tier B (#295694) adds.

## Running tests in parallel

One Kibana sends its requests through one emulator, so tests share its calls and its runtime fixtures.

- **Tests on different connectors may run in parallel**, as long as each scopes what it reads and changes to its connector: `createEmulatorControl(proxyUrl, { connector: 'firecrawl' })`, or `?connector=firecrawl` on the control endpoints. The emulator's name for a connector is its id without the dot.
- **Tests on the same connector that set fixtures, read calls or reset must run serially**, for example in one Playwright project, or one `describe.serial` block, per connector. API tests run serially by default.

The full rule is in the emulator's README, under "Running tests in parallel".
