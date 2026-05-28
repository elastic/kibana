---
navigation_title: Migrate tests
---

# Migrate tests to Scout [scout-migrate-tests]

This guide covers migrating existing FTR and Cypress tests to [Scout](../scout.md).

## Don't migrate blindly [dont-migrate-blindly]

Treat migration as a chance to revisit your tests and make them more robust, not a 1-to-1 port:

:::::::::{stepper}

::::::::{step} Do your UI tests _really_ need to be UI tests?

Many UI tests should be rewritten as API or component tests (see [Pick the right test type](./best-practices.md#pick-the-right-test-type)). <br><br>Whenever possible, prefer an **API test** over asserting on a rendered element. UI tests (the slowest, most expensive, and most brittle kind) should be reserved for full end-to-end user flows. Tests that only verify a component renders correctly belong as **RTL component tests**.

::::::::

::::::::{step} Can your tests reuse Scout's _default_ servers config?

Scout's `default` server configuration is shared across many suites in CI. A **custom server config** spins up a dedicated Kibana process for your suite, which adds CI cost and only runs in our local pipelines (no Elastic Cloud support).

Most FTR-era setups don't need a custom config in Scout:

- **To enable a feature conditionally**: use runtime [feature flags](./feature-flags.md#scout-feature-flags-runtime) via `apiServices.core.settings()` (this works locally and on Cloud, no test servers restart needed).
- **To ingest data**: load via `apiServices`, `kbnClient`, or `esArchiver` in `beforeAll` or a [global setup hook](./global-setup-hook.md).
- **To set UI and advanced settings**: use the `uiSettings` [fixture](./fixtures.md).

Reach for a [custom server config](./feature-flags.md#scout-feature-flags-custom-servers) only when a setting must be present at boot (for example, plugin-`setup`-time HTTP route registration).

::::::::

::::::::{step} Be the driver: review and _understand_ your new tests

We provide AI tooling to most of the toil out of migration, but **always review their AI-generated output manually**. _Understand_ the decisions the AI made for you as it will help you troubleshoot flaky tests down the road. <br><br> **Some helpful questions**: <br> • Did we lose or gain any test coverage with the migration?<br> • Should the new tests really be UI tests? Should they be made [parallel](./parallelism.md)?<br> • Are the [deployment tags](./deployment-tags.md) looking good? See [pick the right tags](./deployment-tags.md#scout-deployment-tags-pick).<br> • Is there any way tests can use Scout's default test servers config?

::::::::

:::::::::

## Let your AI agent help [ai-assist]

Agentic skills in Kibana can take most of the toil out of migration, but **always review their output manually**.

### FTR → Scout

The [`scout-migrate-from-ftr`](https://github.com/elastic/kibana/blob/main/.agents/skills/scout-migrate-from-ftr/SKILL.md) skill analyzes your FTR tests and drafts a **migration plan**. Review it, and the skill executes the migration.

### Cypress → Scout

The [`cypress-to-scout-migration`](https://github.com/elastic/kibana/blob/main/.agents/skills/cypress-to-scout-migration/SKILL.md) skill, maintained by the Security Engineering Productivity team, ports Cypress tests to Scout.

### Best practices review

Run the [`scout-best-practices-reviewer`](https://github.com/elastic/kibana/blob/main/.agents/skills/scout-best-practices-reviewer/SKILL.md) skill on the migrated tests to make sure they follow our [Scout best practices](./best-practices.md).
