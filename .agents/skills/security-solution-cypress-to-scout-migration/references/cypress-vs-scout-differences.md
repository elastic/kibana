# Cypress vs Scout Differences

## Table of Contents
- [Folder Structure](#folder-structure)
- [Authentication](#authentication)
- [CI Execution & Parallelization](#ci-test-execution--parallelization)
- [MKI Pipelines](#mki-pipelines)
- [Local Execution](#local-test-execution)
- [Test Labels/Tags](#test-labelstags)
- [Test Patterns](#test-patterns)
- [Serverless Tiers & Feature Flags](#serverless-tiers--feature-flags)
- [Key Behavioral Differences](#key-behavioral-differences)

## Folder Structure

| Aspect | Cypress | Scout |
|--------|---------|-------|
| Location | Centralized test folder (`test/security_solution_cypress/`) | Tests closer to the plugin (`<plugin>/test/scout/`) |
| Organization | `cypress/e2e/<domain>/` | `test/scout/ui/{tests,parallel_tests}/` |

## Authentication

| Aspect | Cypress | Scout |
|--------|---------|-------|
| ESS | Basic authentication | SAML authentication |
| Serverless | SAML authentication | SAML authentication |
| Auth helpers | Custom login tasks | `browserAuth.loginAsAdmin()`, `loginAsViewer()`, `loginWithCustomRole()` |

Scout uses SAML for both ESS and Serverless, making auth consistent across environments.

## CI Test Execution & Parallelization

| Aspect | Cypress | Scout |
|--------|---------|-------|
| Environment per spec | Each spec runs in a clean environment | Spec files share the same environment |
| Data isolation | Automatic (clean environment) | Manual (different Kibana spaces via `spaceTest`) |
| Parallelization control | `parallelism` attribute in Buildkite YAML | `workers` attribute in Playwright config |
| Parallelization method | Spec files distributed between CI jobs | Tests run in parallel in same Kibana/ES instances, isolated by spaces |

**Critical implication:** In Scout, data created by one test may affect others. Use `spaceTest` + `scoutSpace` for isolation, and clean up in `afterAll`. Because Cypress runs each spec in a clean environment, most Cypress tests have **no cleanup logic at all**. When migrating, you must independently audit what the test creates and add explicit cleanup — do not assume the Cypress test's cleanup (or lack thereof) is sufficient.

## MKI Pipelines

| Aspect | Cypress | Scout |
|--------|---------|-------|
| Periodic pipeline | Active, managed by Security Engineering Productivity | Under development, will be managed by Appex QA |
| Kibana QA quality gate | Active, subset of serverless tests | Under development |
| Adding new tests | Managed by Security Engineering Productivity | Will be managed by Appex QA |

**Important:** Scout does NOT currently run on MKI. If a Cypress test has `@serverless` tag, it provides MKI coverage that Scout cannot replace yet. Keep such Cypress tests until Scout MKI pipelines are ready.

## Local Test Execution

| Aspect | Cypress | Scout |
|--------|---------|-------|
| Environment setup | Cypress creates the environment automatically | You must create the environment first |
| Server start | Automatic | `node scripts/scout.js start-server --stateful` in a separate terminal |
| Running tests | Open Cypress UI or `cypress run` | `node scripts/scout.js run-tests --stateful --testFiles <path>` |
| Debug mode | `--headed` + DevTools | `SCOUT_LOG_LEVEL=debug` or `npx playwright test --ui` |

## Test Labels/Tags

| Aspect | Cypress | Scout |
|--------|---------|-------|
| Label type | Negative tags allowed (`@skipInEss`, `@skipInServerless`) | Positive tags only (due to Playwright's design) |
| ESS | `@ess` | `tags.stateful.classic` |
| Serverless | `@serverless` | `tags.serverless.security_complete` |
| Skip mechanism | `@skipInEss`, `@skipInServerless`, `@skipInServerlessMKI` | No equivalent skip tags — use positive tags to include |
| Validation | No runtime validation | Scout validates UI tags at runtime |

Scout will gain more tagging flexibility (local-only tests, cloud-compatible tests), controlled by Appex QA.

## Test Patterns

| Cypress | Scout |
|---------|-------|
| Screens (selector files) | Page objects (class with locators + methods) |
| Tasks (action files) | Page object methods |
| Direct `cy.get()` in tests | `page.testSubj.locator()` via page objects |
| No EUI abstraction | EUI wrappers (`EuiComboBoxWrapper`, `EuiDataGridWrapper`, etc.) |

## Serverless Tiers & Feature Flags

| Aspect | Cypress | Scout |
|--------|---------|-------|
| Serverless tier config | `ftrConfig` attribute in spec file | Test tags |
| Feature flags (local/CI) | `ftrConfig` attribute in spec file | Custom server configuration for stateless environments |
| Feature flags (MKI/cloud) | Limited — often requires `@skipInServerlessMKI` | Kibana Core APIs |

## Key Behavioral Differences

1. **Spec isolation:** Cypress creates a clean environment per spec file. Scout shares the environment — you must manage state explicitly.

2. **Auto-waiting:** Cypress retries commands with built-in timeout. Playwright/Scout also auto-waits on locator actions but uses different mechanisms (`expect.poll()`, locator assertions).

3. **Async model:** Cypress chains commands in a queue. Scout/Playwright uses `async/await` — more predictable control flow.

4. **Browser context:** In Scout, each `test()` block spins up a new browser context. Use `test.step()` for multi-step flows to reuse context and improve execution time.

5. **Setup/teardown:** Cypress often uses UI for setup. Scout strongly prefers API-based setup via `apiServices`/`kbnClient`.
