# @kbn/scout

`kbn-scout` is a modern test framework for Kibana. It uses Playwright for UI integration tests. Its primary goal is to enhance the developer experience by offering a lightweight and flexible testing solution to create UI tests next to the plugin source code. This README explains the structure of the `kbn-scout` package and provides an overview of its key components.

### Table of Contents

1. Overview
2. Folder Structure
3. Key Components
4. How to Use
5. Contributing
6. Running tests on CI

### Overview

The `kbn-scout` framework provides:

- **Ease of integration:** a simplified mechanism to write and run tests closer to plugins.
- **Deployment-agnostic tests:** enables the testing of Kibana features across different environments (e.g., Stateful, Serverless).
- **Fixture-based design:** built on Playwright's fixture model to modularize and standardize test setup.
- **Focus on Developer Productivity:** faster test execution and minimal boilerplate for writing tests.

### Folder Structure

The `kbn-scout` structure includes the following key directories and files:

```
src/platform/packages/shared/kbn-scout/
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

Scout uses Playwright's [projects concept](https://playwright.dev/docs/test-projects) to define the environment where tests are executed. The following projects are supported:

- **`local`**: Tests are executed against servers started locally. Configuration is auto-generated by Scout and saved to `KIBANA_REPO_ROOT/.scout/servers/local.json`.
- **`ech`**: Tests are executed against a Stateful deployment created in Elastic Cloud. Configuration is **manually** defined in `KIBANA_REPO_ROOT/.scout/servers/cloud_ech.json`.

```json
{
  "serverless": false,
  "isCloud": true,
  "cloudHostName": "elastic_cloud_hostname_qa_staging_prod",
  "cloudUsersFilePath": "/path_to_your_cloud_users/role_users.json",
  "hosts": {
    "kibana": "https://my.cloud.deployment.kb.co",
    "elasticsearch": "https://my.cloud.deployment.es.co"
  },
  "auth": {
    "username": "deployment_username",
    "password": "deployment_password"
  }
}
```

- **`mki`**: Tests are executed against a Serverless project created in Elastic Cloud (MKI). Configuration is **manually** defined in `KIBANA_REPO_ROOT/.scout/servers/cloud_mki.json`.

```json
{
  "serverless": true
  "projectType": "es",
  "isCloud": true,
  "cloudHostName": "elastic_cloud_hostname_qa_staging_prod",
  "cloudUsersFilePath": "/path_to_your_cloud_users/role_users.json",
  "hosts": {
    "kibana": "https://my.es.project.kb.co",
    "elasticsearch": "https://my.es.project.es.co"
  },
  "auth": {
    "username": "operator_username",
    "password": "operator_password"
  }
}
```

#### Starting Servers Only

To start the servers locally without running tests, use the following command:

```bash
node scripts/scout.js start-server [--stateful|--serverless=[es|oblt|security]]
```

- **`--stateful`**: Starts servers in a stateful mode.
- **`--serverless`**: Starts servers in a serverless mode. You can specify additional options like `es` (Elasticsearch), `oblt` (Observability), or `security`.

This command is useful for manual testing or running tests via an IDE.

#### Running Servers and Tests Locally

To start the servers locally and run tests in one step, use:

```bash
node scripts/scout.js run-tests [--stateful|--serverless=[es|oblt|security]] --config <plugin-path>/test/scout/ui/playwright.config.ts
```

- **`--stateful`** or **`--serverless`**: Specifies the deployment type.
- **`--config`**: Path to the Playwright configuration file for the plugin.

This command starts the required servers and automatically executes the tests using Playwright.

#### Running Tests Separately

If the servers are already running, you can execute tests independently using one of the following methods:

1. **Playwright Plugin in IDE**: Run tests directly within your IDE using Playwright's integration.
2. **Command Line**: Use the following command:

```bash
npx playwright test --config <plugin-path>/test/scout/ui/playwright.config.ts --project local
```

- **`--project`**: Specifies the test target as `local` ( `ech` or `mki` for Cloud targets, see below).

#### Running Tests Against Cloud

To run tests against a Cloud deployment, you can use either the Scout CLI or the Playwright CLI.

**Using Scout CLI:**

```bash
node scripts/scout.js run-tests \
  --stateful \
  --testTarget=cloud \
  --config <plugin-path>/test/scout/ui/playwright.config.ts
```

```bash
node scripts/scout.js run-tests \
  --serverless=oblt \
  --testTarget=cloud \
  --config <plugin-path>/test/scout/ui/playwright.config.ts
```

- **`--testTarget=cloud`**: Specifies that tests should run against a Cloud deployment.

**Using Playwright CLI:**

```bash
npx playwright test \
  --project=ech \
  --grep=@ess \
  --config <plugin-path>/test/scout/ui/playwright.config.ts
```

```bash
npx playwright test \
  --project=mki \
  --grep=@svlOblt \
  --config <plugin-path>/test/scout/ui/playwright.config.ts
```

- **`--project`**: Specifies the test target (`ech` for Stateful or `mki` for Serverless).
- **`--grep`**: Filters tests by tags (e.g., `@svlSearch` for Elasticsearch or `@svlOblt` for Observability).

By following these steps, you can efficiently run tests in various environments using Scout.

### Contributing

We welcome contributions to improve and extend `kbn-scout`. This guide will help you get started, add new features, and align with existing project standards.

Make sure to run unit tests before opening the PR:

```bash
node scripts/jest --config src/platform/packages/shared/kbn-scout/jest.config.js
```

#### Setting Up the Environment

Ensure you have the latest local copy of the Kibana repository.

Install dependencies by running the following commands:

- `yarn kbn bootstrap` to install dependencies.
- `node scripts/build_kibana_platform_plugins.js` to build plugins.

Move to the `src/platform/packages/shared/kbn-scout` directory to begin development.

### Adding or Modifying Components

Contributions to sharable `Fixtures`, `API services` and `Page Objects` are highly encouraged to promote reusability, stability, and ease of adoption. Follow these steps:

#### Adding Page Objects

1. **Create a New Page Object:** Add a new file to the `src/playwright/page_objects` directory. For instance:

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

#### Adding API service

1. **Create a New API service:** Add your service to the `src/playwright/fixtures/worker/apis` directory. For instance:

```ts
export interface FleetApiService {
  integration: {
    install: (name: string) => Promise<void>;
    delete: (name: string) => Promise<void>;
  };
}

export const getFleetApiHelper = (log: ScoutLogger, kbnClient: KbnClient): FleetApiService => {
  return {
    integration: {
      install: async (name: string) => {
        // implementation
      },
      delete: async (name: string) => {
        // implementation
      },
    },
  };
};
```

2. **Register the API service:** Update the index file to include the new service:

```ts
export const apiServicesFixture = coreWorkerFixtures.extend<
  {},
  { apiServices: ApiServicesFixture }
>({
  apiServices: [
    async ({ kbnClient, log }, use) => {
      const services = {
        // add new service
        fleet: getFleetApiHelper(log, kbnClient),
      };
      ...
  ],
});
```

#### Adding Fixture

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
export const scoutTestFixtures = mergeTests(coreFixtures, newTestFixture);
```

#### Best Practices

- **Reusable Code:** When creating Page Objects, API services or Fixtures that apply to more than one plugin, ensure they are added to the `kbn-scout` package.
- **Adhere to Existing Structure:** Maintain consistency with the project's architecture.
- **Keep the Scope of Components Clear** When designing test components, keep in naming conventions, scope, maintainability and performance.
  - `Page Objects` should focus exclusively on UI interactions (clicking buttons, filling forms, navigating page). They should not make API calls directly.
  - `API Services` should handle server interactions, such as sending API requests and processing responses.
  - `Fixtures` can combine browser interactions with API requests, but they should be used wisely, especially with the `test` scope: a new instance of the fixture is created for **every test block**. If a fixture performs expensive operations (API setup, data ingestion), excessive usage can **slow down** the test suite runtime. Consider using `worker` scope when appropriate to reuse instances across tests within a worker.
- **Add Unit Tests:** Include tests for new logic where applicable, ensuring it works as expected.
- **Playwright documentation:** [Official best practices](https://playwright.dev/docs/best-practices)

### Running tests on CI

#### Enabling tests for execution

Scout is still in active development, which means frequent code changes may sometimes cause test failures. To maintain stability, we currently do not run Scout tests for every PR and encourage teams to limit the number of tests they add for now.

If a test is difficult to stabilize within a reasonable timeframe, we reserve the right to disable it or even all tests for particular plugin.

To manage Scout test execution, we use the `.buildkite/scout_ci_config.yml` file, where Kibana plugins with Scout tests are registered. If you're unsure about the stability of your tests, please add your plugin under the `disabled` section.

You can check whether your plugin is already registered by running:

```bash
node scripts/scout discover-playwright-configs --validate
```

On CI we run Scout tests only for `enabled` plugins:

For PRs, Scout tests run only if there are changes to registered plugins or Scout-related packages.
On merge commits, Scout tests run in a non-blocking mode.

#### Scout exit codes

| Exit code | Description                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------- |
| 0         | All tests passed                                                                                              |
| 1         | Missing configuration (e.g. SCOUT_CONFIG_GROUP_KEY and SCOUT_CONFIG_GROUP_TYPE environment variables not set) |
| 2         | No tests in Playwright config                                                                                 |
| 10        | Tests failed                                                                                                  |
