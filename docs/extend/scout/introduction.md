---
navigation_title: Introduction
---

# What is Scout? [scout-introduction]

Scout is the modern test orchestration framework designed to elevate the **developer experience**, improve **test maintainability**, and deliver **faster**, more **reliable** test execution.

:::::{note}
Scout supports **UI** and **API** testing with [Playwright](https://playwright.dev).
:::::

## Main features [scout-main-features]

Scout comes packed with great features:

| Feature |  |
| --- | --- |
| ⚡ Faster test execution | Scout allows you to run tests in [parallel](./parallelism.md) against the same cluster. |
| 🧩 Tests live alongside the plugin | Scout tests live close to the plugin **source code**, making them easier to write, run, and maintain. |
| 🌐 Deployment-agnostic by design | Write tests **once** and run them across different environments (for example, stateful or serverless). |
| 🧱 Fixture-based architecture | Use [fixtures](./fixtures.md) in your tests to perform authentication, data ingestion, parallelization, and more. Fixtures also provide access to Kibana APIs and the Elasticsearch client. |
| 🛠️ Enhanced developer experience | Playwright comes with a [UI Mode](https://playwright.dev/docs/test-ui-mode) that lets you walk through each step of the test, see logs, errors, network requests, inspect the DOM snapshot, and more. |
| 📊 Test result reporting | The [Scout Reporter](./reporting.md) captures test run metrics and uploads them to the AppEx QA team’s cluster, helping teams track, analyze, and optimize their tests. |

## Core principles [scout-core-principles]

### Modular and extensible by design [scout-modular-and-extensible]

The core Scout testing functionality lives in the `@kbn/scout` package:

- `@kbn/scout` in the repository: `src/platform/packages/shared/kbn-scout`
- README: `https://github.com/elastic/kibana/tree/main/src/platform/packages/shared/kbn-scout`

It includes common [fixtures](./fixtures.md), [page objects](./page-objects.md), and shared utilities.

Some solutions provide solution-specific Scout packages (for example, `@kbn/scout-oblt` and `@kbn/scout-security`) to introduce solution-specific fixtures, helpers, and page objects.

Plugins can also define their own fixtures/page objects/utilities when those resources are expected to be used only by the plugin itself.

### Encourages collaboration and reusability [scout-collaboration]

Scout encourages teams to reuse resources created by AppEx QA or other teams. This reduces duplication, simplifies adoption, and makes it easier to share best practices.

### Follows best practices [scout-best-practices]

Scout makes it easy to run tests sequentially and in parallel while guiding you toward best practices. For example, Scout:

- Runs every test in a clean [browser context](https://playwright.dev/docs/browser-contexts), improving reproducibility and preventing cascading failures.
- Validates Playwright configuration files to ensure consistent behavior across test suites.
- Limits some fixtures to provide only the functionality a test needs.
  - For example, the ES archiver only allows tests to load archive data; unloading is disabled because Scout handles cleanup at the end of a run.
- Extends some Playwright fixtures with additional helper methods (for example, `page.waitForLoadingIndicatorHidden()`).
- Initializes page objects lazily, so they are initialized only when a test uses them.

## Adopting Scout [scout-adopting]

Existing FTR or Cypress UI tests need to be rewritten to use Scout. This is not just about Playwright semantics—consider adopting Scout holistically:

- Should tests run in parallel?
- Can you reuse an existing fixture/page object/API helper?

### Scout building blocks [scout-building-blocks]

- [Fixtures](./fixtures.md)
- [Page objects](./page-objects.md)
- [API services](./api-services.md)
- [Parallelism](./parallelism.md)
- [Global setup hook](./global-setup-hook.md)

### Scout guides [scout-guides]

- [Best practices](./best-practices.md)
- [Run tests](./run-tests.md)
- [Deployment tags](./deployment-tags.md)
- [Skip tests](./skip-tests.md)
- [Debugging](./debugging.md)
- [Set up your plugin](./setup-plugin.md)
- [Write UI tests](./write-ui-tests.md)
- [Write API tests](./write-api-tests.md)
- [A11y checks](./a11y-checks.md)
- [Browser authentication](./browser-auth.md)
- [API authentication](./api-auth.md)

## FAQ [scout-faq]

#### Q: Does Scout prevent flaky tests? [scout-faq-flakes]

No. While Scout encourages good test design, no test framework alone can eliminate flaky tests.

#### Q: Is Scout designed to be *just* a Playwright UI test runner? [scout-faq-ui-only]

No. Scout currently supports UI and API testing with Playwright.

#### Q: Are test runs going to be faster? [scout-faq-faster]

Overall, yes. Scout supports [parallel test execution](./parallelism.md), which significantly reduces pipeline run times. That said, it’s important to write tests with efficiency in mind.

#### Q: Why is it a good idea for tests to be close to the plugin code? [scout-faq-colocation]

It’s convenient for developers to have tests close to the source code. Scout can also enable smarter test selection in the future (run only the affected tests for a PR).

#### Q: Can I use FTR services in Scout (for example, `esArchiver`)? [scout-faq-ftr-services]

Scout doesn’t directly support FTR services, but most of what you need is available via Scout [fixtures](./fixtures.md).

#### Q: Does Scout support feature flags? [scout-faq-feature-flags]

Not at the moment.

:::::{note}
Internal (Elasticians): if you have questions, AppEx QA maintains additional internal documentation.
:::::

