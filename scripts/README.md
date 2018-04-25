# Kibana Dev Scripts

This directory contains scripts useful for interacting with Kibana tools in development. Use the node executable and `--help` flag to learn about how they work:

```sh
node scripts/{{script name}} --help
```

## For Developers

This directory is excluded from the build and tools within it should help users discover their capabilities. Each script in this directory must:

- require `src/babel-register` to bootstrap babel
- call out to source code in the [`src`](../src) or [`packages`](../packages) directories
- react to the `--help` flag
- run everywhere OR check and fail fast when a required OS or toolchain is not available

## Functional Test Scripts

### `node scripts/functional_tests`
Runs all the functional tests: selenium tests and api integration tests. Uses the [@kbn/test](../packages/kbn-test) library to run Elasticsearch and Kibana servers and tests against those servers, for multiple server+test setups. In particular, calls out to [`runTests()`](../packages/kbn-test/src/functional_tests/tasks.js)

### `node scripts/functional_tests_single`
Runs functional tests for a single config file, i.e. by passing `--config test/functional/config` or `--config test/api_integration/config`. Uses the [@kbn/test](../packages/kbn-test) library to run Elasticsearch and Kibana servers, run the specified tests against them, and shut down the servers. In particular, calls out to [`runWithConfig()`](../packages/kbn-test/src/functional_tests/tasks.js), _though this will be going away soon, in favor of `node scripts/functional_tests` handling this case._

### `node scripts/functional_tests_server`
Starts just the Elasticsearch and Kibana servers given a single config, i.e. via `--config test/functional/config.js` or `--config test/api_integration/config`. Allows the user to start just the servers with this script, and keep them running while running tests against these servers using `node scripts/functional_test_runner --config path/to/same/config/to/ensure/viability`. Uses the [`startServers()`](../packages/kbn-test/src/functional_tests/tasks.js#L52-L80) method from [@kbn/test](../packages/kbn-test) library.

For details on how these scripts work, please [read this readme](../packages/kbn-test/README.md).
