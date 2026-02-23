---
navigation_title: Scout testing framework
---

# Scout [scout]

Scout is Kibana’s **modern UI and API test framework** built on [Playwright](https://playwright.dev). It focuses on **fast test execution**, a good **developer experience**, and **reusable** test building blocks (e.g., [fixtures](./scout/fixtures.md), [page objects](./scout/page-objects.md) and [API services](./scout/api-services.md)).

## Start here [scout-start-here]

- [Getting started](./scout/getting-started.md)
- [Best practices](./scout/best-practices.md)
- [UI testing](./scout/ui-testing.md)
- [API testing](./scout/api-testing.md)

## Why Scout? [scout-main-features]

- **Parallel execution**: run UI suites in [parallel](./scout/parallelism.md) against the same deployment.
- **Co-located tests**: keep tests close to [plugin code](./scout/setup-plugin.md) for easier iteration and maintenance.
- **Deployment-agnostic**: write tests once, then use [tags](./scout/deployment-tags.md) to declare where they should run (stateful/serverless).
- **Fixture-based**: [fixtures](./scout/fixtures.md) cover auth, data setup, clients, and common workflows.
- **Better debugging**: use Playwright [UI Mode](https://playwright.dev/docs/test-ui-mode).
- **Reporting**: we capture test events that power our dashboards (for example, skipped tests, flaky tests, and more).
- **Reusability**: reuse or write reusable fixtures, page objects and API helpers to reduce duplication.
- **Follows modern best practices**: check out our [Scout best practices](./scout/best-practices.md).

## Scout packages [scout-packages]

**Import the right Scout package in your Scout tests:**

- **Platform-owned tests** → `@kbn/scout`

| Package      | Use in tests               |
| ------------ | -------------------------- |
| `@kbn/scout` | Platform (shared baseline) |

- **Solution-owned tests** → your solution Scout package (it builds on `@kbn/scout`)

| Package               | Use in tests           |
| --------------------- | ---------------------- |
| `@kbn/scout-oblt`     | Observability solution |
| `@kbn/scout-security` | Security solution      |
| `@kbn/scout-search`   | Search solution        |

::::::{note}
Fixtures, page objects, and API helpers defined in `@kbn/scout` can be imported by solution-specific Scout packages. When they are defined in a solution package or a plugin they will only be available to that solution or plugin.
::::::

## Contribute to Scout when possible [contribute-to-scout-when-possible]

We welcome contributions to one of the Scout packages.

| If your helper/code…                  | Put it…                                                                                                   | Examples                                           |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Is reusable across many plugins/teams | In `@kbn/scout`                                                                                           | Generic fixtures, page objects, and API helpers    |
| Is reusable but scoped to a solution  | In the solution Scout package (for example `@kbn/scout-security`, `@kbn/scout-oblt`, `@kbn/scout-search`) | Solution workflows and domain-specific helpers     |
| Is specific to one plugin or package  | In your plugin or package’s `test/scout` directory                                                        | Components specific to your plugin or package only |

## Need help?

- **Internal (Elasticians)**: reach out to the AppEx QA team in the `#kibana-scout` Slack channel for guidance.

- **External contributors**: open an issue in the Kibana repository and label it with `Team:QA`.

## FAQ [scout-faq]

#### Q: Does Scout prevent flaky tests? [scout-faq-flakes]

No—good test design still matters.

#### Q: Is Scout designed to be _just_ a Playwright UI test runner? [scout-faq-ui-only]

No. Scout supports both UI and API testing with Playwright.

#### Q: Are test runs going to be faster? [scout-faq-faster]

Often, yes—especially with [parallel test execution](./scout/parallelism.md).

#### Q: Why is it a good idea for tests to be close to the plugin code? [scout-faq-colocation]

It’s easier to iterate and maintain, and it can enable smarter test selection in the future.

#### Q: Can I use FTR services in Scout (for example, `esArchiver`)? [scout-faq-ftr-services]

Not directly—use Scout [fixtures](./scout/fixtures.md) instead.

#### Q: Does Scout support feature flags? [scout-faq-feature-flags]

If your feature is behind a feature flag, you can use the `coreApi` [fixture](https://github.com/elastic/kibana/blob/e4f12d39154fe286ce92217e00a7d8bd758ee02d/src/platform/packages/shared/kbn-scout/src/playwright/fixtures/scope/worker/apis/core/index.ts#L17-L30) to enable it during test execution (recommended). Alternatively, you can create a [custom config directory](https://github.com/elastic/kibana/pull/244306) and link your Scout tests (reach out for more info).
