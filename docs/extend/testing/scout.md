---
navigation_title: API and E2E tests
description: Learn about Scout, Kibana's modern UI and API test framework built on Playwright
---

# Scout [scout]

Scout is Kibana's **modern UI and API test framework** built on [Playwright](https://playwright.dev). It focuses on **fast test execution**, a good **developer experience**, and **reusable** test building blocks (e.g., [fixtures](./fixtures.md), [page objects](./page-objects.md) and [API services](./api-services.md)).

## Start here [scout-start-here]

- [Set up Scout in your plugin](./setup-scout.md)
- [Run Scout tests](./run-scout-tests.md)
- [Best practices](./scout-best-practices.md) (see also [UI](./ui-best-practices.md) and [API](./api-best-practices.md) test best practices)
- [UI testing](./ui-testing.md)
- [API testing](./api-testing.md)
- [Migrate tests to Scout](./migrate-tests.md)
- [EUI test helpers](./eui-test-helpers.md)

## Scout benefits [scout-main-features]

- **Parallel execution**: run UI suites in [parallel](./parallelism.md) against the same deployment.
- **Selective testing**: PR builds can limit Scout runs to affected Playwright configs, cutting CI time. See [how selection works](#scout-faq-selective-testing).
- **Co-located tests**: keep tests close to [plugin code](./setup-scout.md) for easier iteration and maintenance.
- **Deployment-agnostic**: write tests once, then use [tags](./deployment-tags.md) to declare where they should run (stateful/serverless).
- **Fixture-based**: [fixtures](./fixtures.md) cover auth, data setup, clients, and common workflows.
- **Better debugging**: use Playwright [UI Mode](https://playwright.dev/docs/test-ui-mode).
- **Reporting**: we provide you with dashboards to track skipped tests, flaky tests, and more.
- **Reusability**: reuse or write reusable fixtures, page objects and API helpers to reduce duplication.
- **Follows modern best practices**: see [Best practices](./scout-best-practices.md).

## Scout packages [scout-packages]

**Import the right Scout package in your Scout tests:**

- **Platform-owned tests** → `@kbn/scout`

| Package      | Use in tests               |
| ------------ | -------------------------- |
| `@kbn/scout` | Platform (shared baseline) |

- **Solution-owned tests** → your solution Scout package (it builds on `@kbn/scout`)

| Package               | Use in tests                                      |
| --------------------- | ------------------------------------------------- |
| `@kbn/scout-oblt`     | {icon}`logo_observability` Observability solution |
| `@kbn/scout-security` | {icon}`logo_security` Security solution           |
| `@kbn/scout-search`   | {icon}`logo_elasticsearch` Search solution        |

::::::{note}
Fixtures, page objects, and API helpers defined in `@kbn/scout` can be imported by solution-specific Scout packages. When they are defined in a solution package or a plugin they will only be available to that solution or plugin.
::::::

## Contribute to Scout when possible [contribute-to-scout-when-possible]

We welcome contributions to one of the Scout packages.

| If your helper/code…                  | Put it…                                                                                                   | Examples                                           |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Is reusable across many plugins/teams | In `@kbn/scout`                                                                                           | Generic fixtures, page objects, and API helpers    |
| Is reusable but scoped to a solution  | In the solution Scout package (for example `@kbn/scout-security`, `@kbn/scout-oblt`, `@kbn/scout-search`) | Solution workflows and domain-specific helpers     |
| Is specific to one plugin or package  | In your plugin or package's `test/scout` directory                                                        | Components specific to your plugin or package only |

For page objects, "reusable" depends on what renders the UI rather than on how many tests use the helper today. See the [page object placement policy](./page-objects.md#scout-page-objects-placement).

## Need help? [need-help]

- **Internal (Elasticians)**: reach out to the AppEx QA team for guidance.

- **External contributors**: open an issue in the Kibana repository and label it with `Team:QA`.

## FAQ [scout-faq]

#### Q: Does Scout prevent flaky tests? [scout-faq-flakes]

No, good test design still matters.

#### Q: Is Scout designed to be _just_ a Playwright UI test runner? [scout-faq-ui-only]

No. Scout supports both [UI](./ui-testing.md) and [API](./api-testing.md) testing with Playwright.

#### Q: Are test runs going to be faster? [scout-faq-faster]

Often yes, especially with [parallel test execution](./parallelism.md) and selective testing.

#### Q: What is selective testing? [scout-faq-selective-testing]

Scout uses the changed files to narrow the eligible tests in PR builds:

- **Critical Scout files**, or disabling selective testing, select the full eligible set.
- **Changes confined to Scout UI/API test scopes** select the configs that own the changed files. Markdown files, READMEs, and changelogs are ignored for this decision. Changes under a Scout `fixtures/` directory use dependency-based selection because other modules can import those fixtures.
- **Other changes** select configs in affected modules, including downstream consumers. This can include multiple namespaces within a module.

Deployment tags and the pipeline’s CI test-channel selection still apply in every mode.

To inspect the selection decision, open `.scout/testing_scope.json` in the **Scout Test Run Builder** step's Buildkite artifacts. The `kind` field identifies the selection mode:

- `tests-only`: `affectedConfigs` lists the selected Playwright config paths.
- `dependency-tree`: `affectedModules` lists the modules used to select configs.
- `full`: `reason` explains why selective filtering was disabled.

This file records the selection scope, not execution results. Deployment tags and CI test channels still apply. To confirm a suite actually ran, check its test results in the corresponding `Scout Lane #<number> - <arch>-<domain> / <config-set>` step.

#### Q: Why is it a good idea for tests to be close to the plugin code? [scout-faq-colocation]

It’s easier to iterate and maintain, and it lets [selective testing](#scout-faq-selective-testing) map changes to the configs and modules that own the tests.

#### Q: Can I use FTR services in Scout (for example, `esArchiver`)? [scout-faq-ftr-services]

Not directly—use Scout [fixtures](./fixtures.md) instead.

#### Q: What happens to FTR tests? [scout-faq-ftr-tests]

Existing FTR tests continue to run, and teams can migrate them to Scout incrementally over time.

#### Q: Should I migrate every FTR test to Scout? [scout-faq-migrate-ftr-to-scout]

_It depends_: [pick the right test type](./scout-best-practices.md#pick-the-right-test-type) before migrating a test. Refer to our [Migrate tests to Scout](./migrate-tests.md) guide.

#### Q: Does Scout support feature flags? [scout-faq-feature-flags]

Yes. See [Feature flags](./feature-flags.md) for details on enabling flags at runtime with `apiServices.core.settings()` or using custom server configurations.
