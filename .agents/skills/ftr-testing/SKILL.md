---
name: ftr-testing
description: Deep reference for the Kibana Functional Test Runner (FTR). Use when reading, analyzing, debugging, or reviewing FTR tests, including config anatomy, services, page objects, loadTestFile patterns, data loading, tags, CI wiring, and common FTR idioms.
---

# FTR Testing

## Overview

FTR (Functional Test Runner) is Kibana's legacy framework for end-to-end functional tests. Tests are mocha-based (`describe`/`it`) using `@kbn/expect`, driven by config files that wire up Kibana + Elasticsearch servers, services, page objects, and security roles. Understanding FTR deeply is essential for maintaining existing tests and planning migrations.

## Architecture

### Provider context

Every FTR test file exports a provider function that receives `FtrProviderContext`:

```ts
export default ({ getService, getPageObjects, loadTestFile }: FtrProviderContext) => {
  // getService(name): returns a singleton service instance
  // getPageObjects(['name1', 'name2']): returns page object instances
  // loadTestFile(require.resolve('./path')): loads a sub-suite inside a describe block
};
```

The type is defined in `src/platform/packages/shared/kbn-test/src/functional_test_runner/public_types.ts`. Each plugin/solution creates its own typed version (e.g. `x-pack/platform/test/functional/ftr_provider_context.ts`).

### Config anatomy

FTR configs define the full test environment. Key fields:

| Field | What it controls |
|-------|-----------------|
| `testFiles` | Array of test file paths to run |
| `kbnTestServer.serverArgs` | Kibana server CLI flags (features, plugins, encryption keys) |
| `esTestCluster.serverArgs` | Elasticsearch server flags (security, snapshots, repos) |
| `security.roles` | Custom role definitions (ES privileges + Kibana feature privileges) |
| `security.defaultRoles` | Roles applied to the default test user |
| `services` | Named service providers (singletons) |
| `pageObjects` | Named page object providers |
| `apps` | App name-to-URL mappings for `navigateToApp()` |
| `suiteTags` | `{ include?: string[], exclude?: string[] }` for tag-based filtering |
| `uiSettings` | Default UI settings applied before tests |
| `screenshots` | Screenshot capture settings |

### Config inheritance

Configs commonly inherit from base configs via `readConfigFile`:

```ts
import { readConfigFile } from '@kbn/test';

export default async ({ readConfigFile }: FtrConfigProviderContext) => {
  const baseConfig = await readConfigFile(require.resolve('../../config.base.ts'));
  return {
    ...baseConfig.getAll(),
    testFiles: [require.resolve('.')],
    // override specific fields as needed
  };
};
```

Typical chain: leaf config > solution base > platform base > `@kbn/test-suites-src` base.

Key base configs:
- `src/platform/test/functional/config.base.ts` (core Kibana)
- `x-pack/platform/test/functional/config.base.ts` (x-pack platform)
- `x-pack/solutions/observability/test/functional/config.base.ts`
- `x-pack/solutions/security/test/functional/config.base.ts`

### Directory conventions

- Tests: `test/functional/apps/<area>/` or `x-pack/**/test/functional/apps/<area>/`
- Services: `test/functional/services/` or `x-pack/**/test/functional/services/`
- Page objects: `test/functional/page_objects/` or `x-pack/**/test/functional/page_objects/`
- ES archives: `test/functional/fixtures/es_archiver/<name>/` (contains `mappings.json` + `data.json.gz`)
- Kibana archives: `test/functional/fixtures/kbn_archiver/<name>/` (JSON saved objects)

## Core services

### Commonly available services

| Service | What it does |
|---------|-------------|
| `testSubjects` | Interact with elements by `data-test-subj` attribute (`click`, `find`, `existOrFail`, `missingOrFail`, `getVisibleText`, `setValue`) |
| `find` | Low-level element lookups (`byCssSelector`, `byClassName`, `byLinkText`, `allByCssSelector`) |
| `browser` | Browser control: navigation (`get`, `getCurrentUrl`, `refresh`, `goBack`), window size, cookies, localStorage, sessionStorage, keyboard (`pressKeys`), mouse (`moveMouseTo`, `dragAndDrop`), JS execution (`execute`), screenshots |
| `retry` | Retry logic: `retry.try(block)`, `retry.waitFor(desc, block)`, `retry.tryForTime(timeout, block)`, `retry.waitForWithTimeout(desc, timeout, block)` |
| `esArchiver` | Load/unload ES index archives: `load(path)`, `unload(path)`, `loadIfNeeded(path)` |
| `kibanaServer` | Server operations: `uiSettings.replace(settings)`, `uiSettings.update(settings)`, `importExport.load(path)`, `importExport.unload(path)`, `savedObjects.create(type, attrs)`, `savedObjects.delete(type, id)`, `status.getOverallState()` |
| `es` | Raw Elasticsearch client for direct index/search/delete operations |
| `supertest` | HTTP client for Kibana API calls (authenticated as default user) |
| `supertestWithoutAuth` | HTTP client without default authentication |
| `security` | Role and user management: `security.role.create(name, def)`, `security.user.create(name, def)` |
| `deployment` | Deployment info: `isServerless()`, `isCloud()` |

### Retry patterns

FTR's `retry` service is heavily used because the framework lacks Playwright's auto-waiting:

```ts
// Retry until the block doesn't throw (up to the default timeout)
await retry.try(async () => {
  const text = await testSubjects.getVisibleText('myElement');
  expect(text).to.be('expected value');
});

// Wait until the block returns true
await retry.waitFor('element to appear', async () => {
  return await testSubjects.exists('myElement');
});

// Retry with explicit timeout
await retry.tryForTime(30000, async () => {
  await testSubjects.existOrFail('slowElement');
});
```

### testSubjects patterns

`testSubjects` is the primary way FTR interacts with UI elements via `data-test-subj`:

```ts
await testSubjects.click('saveButton');
await testSubjects.existOrFail('successToast');        // throws if not found
await testSubjects.missingOrFail('loadingSpinner');    // throws if found
await testSubjects.setValue('nameInput', 'my-name');
const text = await testSubjects.getVisibleText('title');
const exists = await testSubjects.exists('optionalElement');
```

Note: `existOrFail` and `missingOrFail` are assertions disguised as helpers. In Scout, these should become explicit `expect()` calls in the test body.

## Page objects

Page objects encapsulate UI interactions for a specific page or feature area. They are registered in config and accessed via `getPageObjects()`:

```ts
const { common, dashboard, header } = getPageObjects(['common', 'dashboard', 'header']);

await common.navigateToApp('dashboard');
await header.waitUntilLoadingHasFinished();
await dashboard.clickNewDashboard();
```

Key platform page objects: `common` (navigation, app switching), `header` (loading indicators, breadcrumbs), `dashboard`, `discover`, `visualize`, `lens`, `settings`, `timePicker`, `home`.

Page objects are defined as classes or provider functions and registered in `page_objects/index.ts`:

```ts
export const pageObjects = {
  common: CommonPageProvider,
  dashboard: DashboardPageProvider,
  header: HeaderPageProvider,
  // ...
};
```

## loadTestFile pattern

Index files use `loadTestFile` to compose suites from multiple files:

```ts
export default ({ loadTestFile }: FtrProviderContext) => {
  describe('dashboard', function () {
    // Shared setup applies to ALL loaded suites
    before(async () => {
      await esArchiver.load('dashboard/current/data');
    });

    after(async () => {
      await esArchiver.unload('dashboard/current/data');
    });

    loadTestFile(require.resolve('./feature_controls'));
    loadTestFile(require.resolve('./preserve_url'));
    loadTestFile(require.resolve('./panel_actions'));
  });
};
```

Key implications:
- Shared `before`/`after` hooks in the index file apply to every loaded suite
- Suites execute in the order listed (and may depend on this ordering)
- Each `loadTestFile` target shares the same mocha context (browser state persists across `it` blocks within a suite)

## Data loading

### esArchiver

Loads/unloads Elasticsearch index data from fixture directories:

```ts
const esArchiver = getService('esArchiver');

// In before/after hooks:
await esArchiver.load('test/functional/fixtures/es_archiver/dashboard/current/data');
await esArchiver.unload('test/functional/fixtures/es_archiver/dashboard/current/data');

// Load only if the index doesn't already exist:
await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
```

Archive directories contain `mappings.json` (index settings/mappings) and `data.json.gz` (documents).

### kibanaServer (saved objects)

Loads/unloads Kibana saved objects (dashboards, data views, visualizations):

```ts
const kibanaServer = getService('kibanaServer');

await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/dashboard/current/kibana');
await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/dashboard/current/kibana');
```

### UI settings

```ts
// Replace ALL settings (wipes existing, sets new)
await kibanaServer.uiSettings.replace({ 'timepicker:timeDefaults': '...' });

// Merge into existing settings
await kibanaServer.uiSettings.update({ 'theme:darkMode': true });
```

Note the semantic difference: `replace` wipes all settings first, `update` merges.

## Tags and CI

### Test tags

Tags control which tests run in which environments:

```ts
describe('my suite', function () {
  this.tags(['skipServerless']);       // skip in serverless
  this.tags(['skipStateful']);         // skip in stateful
  this.tags(['skipSvlSec']);           // skip in serverless security
  this.tags(['includeFirefox']);       // include in Firefox runs
});
```

Config-level filtering via `suiteTags`:

```ts
suiteTags: {
  include: [],
  exclude: ['skipStateful'],   // stateful config excludes skipStateful tests
}
```

### CI config files

FTR configs must be listed in `.buildkite/ftr_*_configs.yml` to run in CI:

- `ftr_platform_stateful_configs.yml`: platform stateful configs
- `ftr_base_serverless_configs.yml`: base serverless configs
- `ftr_security_stateful_configs.yml` / `ftr_security_serverless_configs.yml`: security solution
- `ftr_oblt_stateful_configs.yml` / `ftr_oblt_serverless_configs.yml`: observability solution
- `ftr_search_stateful_configs.yml` / `ftr_search_serverless_configs.yml`: search solution

Each file has `enabled:` and `disabled:` sections. A config not listed in any file won't run in CI.

## Running FTR locally

```bash
# All-in-one (starts servers + runs tests):
node scripts/functional_tests --config <path>

# Start servers separately (keep running):
node scripts/functional_tests_server --config <path>

# Run tests against running servers:
node scripts/functional_test_runner --config <path>

# Run a specific test file:
node scripts/functional_test_runner --config <path> --grep "suite name"
```

## Common FTR idioms

### Shared browser state across `it` blocks

In FTR, `it` blocks within the same `describe` share browser state. This enables multi-step journeys but creates implicit ordering dependencies:

```ts
describe('CRUD flow', () => {
  it('creates an entity', async () => { /* navigates, fills form, saves */ });
  it('edits the entity', async () => { /* continues from previous state */ });
  it('deletes the entity', async () => { /* continues from previous state */ });
});
```

This pattern doesn't translate directly to Scout/Playwright where each `test()` gets a fresh browser context.

### Conditional logic based on deployment

```ts
const deployment = getService('deployment');
const isServerless = await deployment.isServerless();

if (isServerless) {
  // serverless-specific behavior
} else {
  // stateful-specific behavior
}
```

### Waiting for page readiness

```ts
await PageObjects.header.waitUntilLoadingHasFinished();
await testSubjects.existOrFail('pageContent');
```

`waitUntilLoadingHasFinished` waits for the global loading indicator to disappear. This is a very common FTR pattern but is restricted in Scout (where you should wait on content-specific ready signals instead).

## Common pitfalls

- **Assuming `it` block independence**: `it` blocks in the same `describe` share browser state and often depend on execution order.
- **Missing `loadTestFile` context**: shared `before`/`after` in index files silently apply to all loaded suites. Easy to miss when reading individual test files.
- **Config inheritance surprises**: a leaf config may inherit roles, server args, and services from a chain of base configs. Always trace the full chain.
- **`existOrFail` is an assertion**: looks like a query but throws on failure. When analyzing tests, treat it as an assertion.
- **`retry.try` masking flakiness**: wrapping assertions in `retry.try` can hide genuine bugs by retrying until they pass by chance.
- **UI-based setup**: using `navigateToApp` + clicks in `before` hooks for setup is slow and fragile. API-based setup via `kibanaServer` or `es` is preferred.
- **Archive path conventions**: archive paths are relative and resolved by the `esArchiver.baseDirectory` config. Check the config to understand where archives are loaded from.
- **Tag mismatches**: a test tagged `@skipServerless` in a config that doesn't exclude that tag will still run. Tags only work when the config's `suiteTags.exclude` lists them.
