# What is Scout?

Scout is the modern test orchestration framework designed to elevate the **developer experience**, improve **test maintainability**, and deliver **faster**, more **reliable** test execution.

> 📌 As of now, Scout supports **UI** and **API** testing with [**Playwright**](https://playwright.dev).

## Main features

Scout comes packed with great features:

| Feature                            |                                                                                                                                                                                                       |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ⚡ Faster test execution           | Scout allows you to run tests in parallel against the same cluster.                                                                                                                                   |
| 🧩 Tests live alongside the plugin | Scout tests live close to the plugin **source code**, making them easier to write, run, and maintain.                                                                                                 |
| 🌐 Deployment-agnostic by design   | Write tests **once** and run them across different environments (e.g., stateful or serverless).                                                                                                       |
| 🧱 Fixture-based architecture      | Use fixtures in your tests to perform authentication, data ingestion, parallelization, performance. Fixtures also provide access to the Kibana APIs and the Elasticsearch client.                     |
| 🛠️ Enhanced developer experience   | Playwright comes with a [UI Mode](https://playwright.dev/docs/test-ui-mode) that lets you walk through each step of the test, see logs, errors, network requests, inspect the DOM snapshot, and more. |
| 📊 Test result reporting           | The Scout Reporter captures test run metrics and uploads them to the AppEx QA team's cluster, helping teams better track, analyze, and optimize their tests.                                          |

## Core principles

### Modular and extensible by design

The **core** Scout testing functionality resides in the [`@kbn/scout` package](https://github.com/elastic/kibana/tree/main/src/platform/packages/shared/kbn-scout), which includes common fixtures, page objects, and shared utilities. We expect these resources to be useful in most tests.

Some solutions have created their **solution-specific** Scout packages (e.g., [`@kbn/scout-oblt`](https://github.com/elastic/kibana/tree/main/x-pack/solutions/observability/packages/kbn-scout-oblt) and [`@kbn/scout-security`](https://github.com/elastic/kibana/tree/main/x-pack/solutions/security/packages/kbn-scout-security)) to introduce solution-specific fixtures, helpers, and page objects that plugins can import.

It is also possible for a **plugin** to define its own fixtures, page objects, and utilities – if those resources are expected to be used just by the plugin itself.

### Encourages collaboration and reusability

Scout encourages teams to reuse the resources created by the AppEx QA or any other team. This helps reduce code duplication, and simplifies support and adoption. If existing functionality is missing, teams can contribute it to one of the Scout packages.

### Follows best practices

Scout makes it easy to run tests your way – sequentially, in parallel, and more – while guiding you toward best practices. For example, Scout:

- Runs every test in a clean [browser context](https://playwright.dev/docs/browser-contexts), which improves reproducibility and prevents cascading test failures.
- Validates the Playwright configuration files to ensure consistent behavior across test suites.
- Limits certain fixtures to provide only the functionality that a test would need.
  - For example, the ES archiver only allows tests to load archive data; unloading is disabled as we take care of that for you at the end of the test run.
- Extends some of the existing Playwright fixtures with additional helper methods (e.g, `page.waitForLoadingIndicatorHidden()`).
- Initializes page objects lazily, so that they are initialized only when your test uses them.

## Fixtures

Fixtures offer essential context to your tests. The `@kbn/scout` package includes a collection of fixtures specifically designed for Scout tests. These fixtures provide reusable, scoped resources to ensure that tests have consistent and isolated access to critical services such as logging, configuration, and Kibana and Elasticsearch clients.

### Usage

Fixtures are similar to **FTR services**. They help tests with authentication, parallelization, and provide access to the Elasticsearch client, ES archiver, Kibana APIs, and more.

```ts
test.describe('My test suite', { tag: tags.deploymentAgnostic }, () => {
  test.beforeAll(async ({ kbnClient }) => {
    // [1]
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.ECOMMERCE);
  });

  test.beforeEach(async ({ browserAuth }) => {
    // [2]
    await browserAuth.loginAsViewer();
  });

  // ...
});
```

**[1]** `kbnClient` is a fixture from `@kbn/scout` that provides access to the Kibana client.

**[2]** `browserAuth` is also a fixture from `@kbn/scout`.

### Fixture scope

Fixtures can be scoped either to the **test** or the **worker**. The scope decides when to initialize a new fixture instance: once per worker or for every test function.

It is important to choose the correct scope to ensure optimal test execution speed: if a new instance is not needed for every test, the fixture should be scoped to the **worker**. Otherwise, it should be scoped to the **test**.

Worker-scoped fixtures live as long as the worker lives. If a test fails, Playwright [shuts down](https://playwright.dev/docs/test-parallel#worker-processes) the workers to guarantee pristine environment for the following tests.

### Core Scout fixtures

Here are the fixtures provided by `@kbn/scout` (as well as solution-specific Scout packages):

| Scout worker-scoped fixtures |                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| `apiClient`                  | A [supertest](https://github.com/forwardemail/supertest) wrapper for making HTTP requests. |
| `apiServices`                | An extendable group of API helpers that interact with servers.                             |
| `config`                     | Access to the test servers configuration.                                                  |
| `esArchiver`                 | Utility for loading Elasticsearch data archives.                                           |
| `esClient`                   | An Elasticsearch client instance for interacting with the cluster.                         |
| `kbnClient`                  | A Kibana client for making HTTP requests to the Kibana server.                             |
| `requestAuth`                | Utility for retrieving an API key for a specified role using SAML authentication.          |
| `log`                        | A logger instance for use within fixtures and tests.                                       |
| `samlAuth`                   | Utility for generating and handling SAML authentication flows in Kibana.                   |

| Scout **test**-scoped fixtures |                                                                                                                            |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `browserAuth`                  | Enables Kibana login by setting authentication cookies directly in the browser context.                                    |
| `pageObjects`                  | Provides access to the registered page objects.                                                                            |
| `page`                         | [Built-in Playwright fixture](https://playwright.dev/docs/api/class-page) that Scout extends with some additional methods. |

> **⚠️ Limited fixture availability**
> Some fixtures are only available in **UI** tests (e.g., browser-related fixtures), whereas others are only available in **API** tests (e.g., `ApiWorkerFixtures` like `apiClient` and `requestAuth`).

## Write Scout API tests

In this guide we take a look at a real-world Scout API test. We assume you have set up your plugin to work with Scout.

### A real-world example

Let's take a look at [this](https://github.com/elastic/kibana/blob/0cc78184957fcd12110dabae50353392ea937508/x-pack/platform/plugins/private/painless_lab/test/scout/api/tests/execute_api_disabled.spec.ts#L12-L33) API test of the [painless_lab](https://github.com/elastic/kibana/tree/main/x-pack/platform/plugins/private/painless_lab/test/scout) plugin:

```ts
import type { RoleApiCredentials } from '@kbn/scout'; // [1]
import { apiTest, expect, tags } from '@kbn/scout'; // [1]
import { COMMON_HEADERS, TEST_INPUT } from '../fixtures/constants';

apiTest.describe(
  '[search serverless] POST api/painless_lab/execute',
  { tag: tags.serverless.search },
  () => {
    let adminApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin'); // [2]
    });

    apiTest('should return 404', async ({ apiClient }) => {
      const response = await apiClient.post('api/painless_lab/execute', {
        // [3]
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: TEST_INPUT.script,
      });
      expect(response.statusCode).toBe(404); // [4]
      expect(response.body.message).toBe('Not Found');
    });
  }
);
```

- **[1]** Import from `@kbn/scout-oblt` or from `@kbn/scout-security` if your plugin belongs to a specific solution.
- **[2]** We request an API key for the `admin` role using the `requestAuth` fixture.
- **[3]** We send a POST request to our plugin endpoint using the `apiClient` fixture.
- **[4]** We finally check that the response status code and body are as expected.

In the example above, note the following:

- In the `beforeAll` block we use the `requestAuth` fixture to request an API key for the `admin` role (that we later pass to `apiClient`).
- In the `should return 404` test case we use the `apiClient` fixture to send an HTTP request to our plugin endpoint.
- We finally check that the response status code and body are as expected.

> **⚠️ Fixture availability**
> Some fixtures (e.g., browser-specific) are disabled as API tests should test server-side functionality only.

### Save the test file

API tests must have a file name that ends with `.spec.ts` (example: `execute_api_disabled.spec.ts`), and should be saved under the `<plugin-root>/test/scout/api/tests` directory.

> **API tests and parallelism**
> 📌 We're not expecting API tests to benefit from parallel runs as they usually run extremely quickly (in the order of _milliseconds_). Reach out to our team if you have a specific use case in mind that can benefit from parallel execution.

## Write Scout UI tests

This guide reviews a real-world UI test using Scout. We assume you have set up your plugin to work with Scout.

### A real-world example

Let's take a look at [this](https://github.com/elastic/kibana/blob/5d49f1bb0de978e1896254378161c3da23a7d8e6/x-pack/platform/plugins/private/painless_lab/test/scout/ui/tests/painless_lab.spec.ts#L41-L63) UI test from the `painless_lab` plugin:

```ts
import { expect, tags } from '@kbn/scout'; // [1]
import { test } from '../fixtures';

// ...

test.describe('Painless Lab', { tag: tags.stateful.all }, () => {
  // [2]
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.painlessLab.goto();
    await pageObjects.painlessLab.waitForEditorToLoad();
  });

  test('validate painless lab editor and request', async ({ pageObjects }) => {
    await pageObjects.painlessLab.setCodeEditorValue(TEST_SCRIPT);
    await pageObjects.painlessLab.editorOutputPane.waitFor({ state: 'visible' });
    await expect(pageObjects.painlessLab.editorOutputPane).toContainText(TEST_SCRIPT_RESULT);

    await pageObjects.painlessLab.viewRequestButton.click();
    await expect(pageObjects.painlessLab.requestFlyoutHeader).toBeVisible();

    expect(await pageObjects.painlessLab.getFlyoutRequestBody()).toBe(TEST_SCRIPT_REQUEST);

    await pageObjects.painlessLab.flyoutResponseTab.click();
    expect(await pageObjects.painlessLab.getFlyoutResponseBody()).toBe(
      UPDATED_TEST_SCRIPT_RESPONSE
    );
  });
});
```

**[1]**: Import from `@kbn/scout-oblt` or from `@kbn/scout-security` if your plugin belongs to a specific solution.

**[2]**: The `browserAuth` and `pageObjects` fixtures are used to log into and interact with Kibana.

In the example above, note the following:

- We import `test` instead of `spaceTest` (used in parallel test runs).
- We use the `browserAuth` fixture to log into Kibana as an admin.
- We navigate to the Painless Lab page and wait for the editor to load with page objects (available via the `pageObjects` fixture).

### Save the test file

UI tests must have a file name that ends with `.spec.ts` (example: `painless_lab.spec.ts`), and should be saved under:

- `<plugin-root>/test/scout/ui/tests` (for sequential tests) or
- `<plugin-root>/test/scout/ui/parallel_tests` (for parallel tests).
