# @kbn/scout

`kbn-scout` is a modern test framework for Kibana. It uses Playwright for UI integration tests. Its primary goal is to enhance the developer experience by offering a lightweight and flexible testing solution to create UI tests next to the plugin source code. This README explains the structure of the `kbn-scout` package and provides an overview of its key components.

### Table of Contents

1. Overview
2. Folder Structure
3. Key Components
4. How to Use
5. Contributing

### Overview

The `kbn-scout` framework provides:

- **Ease of integration:** a simplified mechanism to write and run tests closer to plugins.
- **Deployment-agnostic tests:** enables the testing of Kibana features across different environments (e.g., Stateful, Serverless).
- **Fixture-based design:** built on Playwright's fixture model to modularize and standardize test setup.
- **Focus on Developer Productivity:** faster test execution and minimal boilerplate for writing tests.

### Folder Structure

The `kbn-scout` structure includes the following key directories and files:

```
packages/kbn-scout/
├── src/
│   ├── cli/
│   ├── common/
│   │   ├── services/
│   │   ├── utils/
│   ├── config/
│   │   ├── loader/
│   │   ├── schema/
│   │   └── serverless/
│   │   └── stateful/
│   │   └── config.ts
│   ├── playwright/
│   │   ├── config/
│   │   └── fixtures
│   │   │   └── test/
│   │   │   └── worker/
│   │   └── page_objects/
│   │   └── runner
│   │   │   └── config_validator.ts
│   │   │   └── run_tests.ts
│   ├── servers/
│   │   ├── run_elasticsearch.ts
│   │   └── run_kibana_server.ts
│   │   └── start_servers.ts
│   ├── types/
│   └── index.ts
├── package.json
├── tsconfig.json
```

### Key Components

1. **src/cli/**

Contains the logic to start servers, with or without running tests. It is accessed through the `scripts/scout` script.

2. **src/common/**

`services` directory includes test helpers used across UI and API integration tests, such as Kibana and Elasticsearch `clients`, `esArchiver`, and `samlSessionManager`. These services are used to initialize instances and expose them to tests via Playwright worker fixtures.

3. **src/config/**

`config` directory holds configurations for running servers locally. `serverless` and `stateful` directories contain deployment-specific configurations. Configuration attributes are defined in `schema` directory.
The `Config` class in config.ts serves as the main entry point. It is instantiated using the config loader in
the `loader` directory. This instance is compatible with the `kbn-test` input format and is passed to functions
for starting servers.

4. **src/playwright/**

#### Config

`playwright` directory manages the default Playwright configuration. It exports the `createPlaywrightConfig` function, which is used by Kibana plugins to define Scout playwright configurations and serves as the entry point to run tests.

```ts
import { createPlaywrightConfig } from '@kbn/scout';

// eslint-disable-next-line import/no-default-export
export default createPlaywrightConfig({
    testDir: './tests',
    workers: 2,
});
```

Scout relies on configuration to determine the test files and opt-in [parallel test execution](https://playwright.dev/docs/test-parallel) against the single Elastic cluster.

The Playwright configuration should only be created this way to ensure compatibility with Scout functionality. For configuration
verification, we use a marker `VALID_CONFIG_MARKER`, and Scout will throw an error if the configuration is invalid.

#### Fixtures

The `fixtures` directory contains core Scout capabilities required for testing the majority of Kibana plugins. [Fixtures](https://playwright.dev/docs/test-fixtures) can be
scoped to either `test` or `worker`. Scope decides when to init a new fixture instance: once per worker or for every test function. It is important to choose the correct scope to keep test execution optimally fast: if **a new instance is not needed for every test**, the fixture should be scoped to **worker**. Otherwise, it should be scoped to **test**.

**Core `worker` scoped fixtures:**
- `log`
- `config`
- `esClient`
- `kbnClient`
- `esArchiver`
- `samlAuth`

```ts
    test.beforeAll(async ({ kbnClient }) => {
      await kbnClient.importExport.load(testData.KBN_ARCHIVES.ECOMMERCE);
    });
```

**Core `test` scoped fixtures:**
- `browserAuth`
- `pageObjects`
- `page`

```ts
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });
```

If a new fixture depends on a fixture with a `test` scope, it must also be `test` scoped.

#### Page Objects

The `page_objects` directory contains all the Page Objects that represent Platform core functionality such as Discover, Dashboard, Index Management, etc.

If a Page Object is likely to be used in more than one plugin, it should be added here. This allows other teams to reuse it, improving collaboration across teams, reducing code duplication, and simplifying support and adoption.

Page Objects must be registered with the `createLazyPageObject` function, which guarantees its instance is lazy-initialized. This way, we can have all the page objects available in the test context, but only the ones that are called will be actually initialized:

```ts
export function createCorePageObjects(page: ScoutPage): PageObjects {
  return {
    dashboard: createLazyPageObject(DashboardApp, page),
    discover: createLazyPageObject(DiscoverApp, page),
    // Add new page objects here
  };
}
```

All registered Page Objects are available via the `pageObjects` fixture:

```ts
test.beforeEach(async ({ pageObjects }) => {
    await pageObjects.discover.goto();
});
```

5. **src/servers/**

Here we have logic to start Kibana and Elasticsearch servers using `kbn-test` functionality in Scout flavor.
The instance of the `Config` class is passed to start servers for the specific deployment type. The `loadServersConfig` function not only returns a `kbn-test` compatible config instance, but also converts it to `ScoutServiceConfig` format and saves it on disk to `./scout/servers/local.json` in the Kibana root directory. Scout `config` fixture reads it and expose to UI tests.

### How to Use

#### Starting Servers Only

To start the servers without running tests, use the following command:

```bash
node scripts/scout.js start-server [--stateful|--serverless=[es|oblt|security]]
```

This is useful for manual testing or running tests via an IDE.

#### Running Servers and Tests

To start the servers and run tests, use:

```bash
node scripts/scout.js run-tests [--stateful|--serverless=[es|oblt|security]] --config <plugin-path>/ui_tests/playwright.config.ts
```

This command starts the required servers and then automatically executes the tests using Playwright.

#### Running Tests Separately

If the servers are already running, you can execute tests independently using either:

- Playwright Plugin in IDE: Run tests directly within your IDE using Playwright's integration.
- Command Line: Use the following command to run tests:

```bash
npx playwright test --config <plugin-path>/ui_tests/playwright.config.ts
```

### Contributing

We welcome contributions to improve and extend `kbn-scout`. This guide will help you get started, add new features, and align with existing project standards.

Make sure to run unit tests before opening the PR:

```bash
node scripts/jest --config packages/kbn-scout/jest.config.js
```

#### Setting Up the Environment

Ensure you have the latest local copy of the Kibana repository.

Install dependencies by running the following commands:
- `yarn kbn bootstrap` to install dependencies.
- `node scripts/build_kibana_platform_plugins.js` to build plugins.

Move to the `packages/kbn-scout` directory to begin development.

#### Adding or Modifying Features

Contributions to sharable fixtures and page objects are highly encouraged to promote reusability, stability, and ease of adoption. Follow these steps:

Create a New Page Object: Add your Page Object to the `src/playwright/page_objects` directory. For instance:

#### Adding Page Objects

1. **Create a New Page Object:** Add your Page Object to the src/playwright/page_objects directory. For instance:

```ts
export class NewPage {
  constructor(private readonly page: ScoutPage) {}

  // implementation
}
```
2. **Register the Page Object:** Update the index file to include the new Page Object:
```ts
export function createCorePageObjects(page: ScoutPage): PageObjects {
  return {
    ...
    newPage: createLazyPageObject(NewPage, page),
  };
}
```
#### Adding Fixtures
1. **Determine Fixture Scope:** Decide if your fixture should apply to the `test` (per-test) or `worker` (per-worker) scope.

2. **Implement the Fixture:** Add the implementation to `src/playwright/fixtures/test` or `src/playwright/fixtures/worker`.

```ts
export const newTestFixture = base.extend<ScoutTestFixtures, ScoutWorkerFixtures>({
  newFixture: async ({}, use) => {
    const myFn = // implementation
    await use(myFn);
    // optionally, cleanup on test completion
  },
});
```
3. **Register the Fixture:** Add the fixture to the appropriate scope:
```ts
export const scoutTestFixtures = mergeTests(
  ...
  newTestFixture,
);
```

#### Best Practices
- **Reusable Code:** When creating Page Objects or Fixtures that apply to more than one plugin, ensure they are added to the kbn-scout package.
- **Adhere to Existing Structure:** Maintain consistency with the project's architecture.
- **Add Unit Tests:** Include tests for new logic where applicable, ensuring it works as expected.
- **Playwright documentation:** [Official best practices](https://playwright.dev/docs/best-practices)
