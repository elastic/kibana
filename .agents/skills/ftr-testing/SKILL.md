---
name: ftr-testing
description: Use when creating, updating, debugging, or reviewing Kibana Functional Test Runner (FTR) tests, including test structure, services/page objects, loadTestFile patterns, tags, and how to run FTR locally.
---

# FTR Testing

## Overview
FTR (FunctionalTestRunner) runs Kibana UI functional tests written in mocha with `@kbn/expect`. Core principle: use FTR services/page objects for interactions, keep tests organized by config, and understand loadTestFile-driven suites.

## Core workflow

1. Identify the FTR config and test file location.
   - FTR suites live under `test/**` or `x-pack/**/test/**` with config files.
   - To confirm a config is actually executed in CI, check the relevant `.buildkite/ftr_*_configs.yml` and whether it’s listed under `enabled:` vs `disabled:`.
2. Understand the test structure.
   - Tests export a provider function that defines a mocha suite.
   - Use `describe/it/before/beforeEach/after/afterEach`.
3. Use services and page objects.
   - Services provide shared capabilities (browser, testSubjects, retry, esArchiver).
   - Services are named singletons created from `FtrService` subclasses.
   - Page objects wrap UI interactions.
4. Watch for `loadTestFile` usage.
   - Index files can load multiple suites with shared setup.
5. Use tags in `describe()` to control CI grouping and skips.
6. If unfamiliar with a page, run the existing FTR tests to learn the flow before migrating.

## Quick reference

- Run all-in-one: `node scripts/functional_tests`
- Run server + tests:
  - `node scripts/functional_tests_server`
  - `node scripts/functional_test_runner --config <path>`
- Common services: `browser`, `testSubjects`, `retry`, `esArchiver`, `kibanaServer`.
- Page objects and services are fetched via `getPageObjects()` / `getService()`.

## Common patterns

### loadTestFile

```ts
export default ({ loadTestFile }: FtrProviderContext) => {
  describe('suite', () => {
    loadTestFile(require.resolve('./pages/rules_page'));
  });
};
```

Notes:
- Index files often include shared setup/teardown; it applies to every loaded suite.
- When migrating, each `loadTestFile` target becomes its own Scout spec and shared setup
  must be duplicated or refactored into fixtures/helpers.

### Services and page objects

```ts
export default ({ getService, getPageObjects }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const pageObjects = getPageObjects(['header', 'common']);

  describe('My suite', () => {
    it('does something', async () => {
      await pageObjects.common.navigateToApp('home');
      await testSubjects.existOrFail('homeApp');
      expect(await browser.getCurrentUrl()).toContain('home');
    });
  });
};
```

## Common mistakes

- Adding UI logic directly in tests instead of using services/page objects.
- Ignoring `loadTestFile` shared setup in index files.
- Running with the wrong config file (stateful vs serverless).
