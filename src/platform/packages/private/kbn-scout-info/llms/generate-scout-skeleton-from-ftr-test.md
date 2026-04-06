# Generate Scout skeleton with empty test cases from existing FTR test

Migrate existing FTR tests to Scout by creating empty test skeletons. Generate the complete test structure with TODO comments indicating what needs to be implemented, but without actual test logic.

# Inputs

The input will be either a single FTR file or a folder with multiple FTR files.

# Core Requirements

**IMPORTANT**: Do not modify the codebase. Instead, output the migrated code as explained in the Output Format section below.

- Convert ALL test suites and test cases - do not skip any
- Preserve the Elasticsearch license header
- Keep any constants defined outside test cases and hooks in their original location
- Remove all non-Scout imports
- No syntax errors permitted
- Try to infer the tag that the test suite will need by taking a look at the FTR files. The tag is mandatory. When in doubt, use `tags.stateful.all`

## Context on FTR loadTestFile Pattern

A common pattern in FTR is to use a central test file (often index.ts) to group and orchestrate other test files using the loadTestFile function. This central file typically contains shared setup and teardown logic in hooks (before, beforeEach, etc.) that apply to all the loaded test files. Example:

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

const ARCHIVE = 'x-pack/solutions/observability/test/fixtures/es_archives/uptime/full_heartbeat';

export default ({ loadTestFile, getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const uptime = getService('uptime');

  describe('Uptime app', function () {
    beforeEach('delete settings', async () => {
      await uptime.common.deleteUptimeSettingsObject();
    });

    describe('with generated data', () => {
      beforeEach('load heartbeat data', async () => {
        await esArchiver.load(
          'x-pack/solutions/observability/test/fixtures/es_archives/uptime/blank'
        );
      });
      afterEach('unload', async () => {
        await esArchiver.unload(
          'x-pack/solutions/observability/test/fixtures/es_archives/uptime/blank'
        );
      });

      loadTestFile(require.resolve('./settings'));
      loadTestFile(require.resolve('./certificates'));
    });

    describe('with real-world data', () => {
      before(async () => {
        await esArchiver.unload(ARCHIVE);
        await esArchiver.load(ARCHIVE);
        await kibanaServer.uiSettings.replace({ 'dateFormat:tz': 'UTC' });
        await uptime.navigation.goToUptime();
      });
      after(async () => await esArchiver.unload(ARCHIVE));

      loadTestFile(require.resolve('./overview'));
      loadTestFile(require.resolve('./ml_anomaly'));
      loadTestFile(require.resolve('./feature_controls'));
    });

    describe('mappings error state', () => {
      loadTestFile(require.resolve('./missing_mappings'));
    });
  });
};
```

Scout does not support `loadTestFile`. Each test file in Scout must be standalone and independent. Therefore, when migrating this pattern, you must create a separate, self-contained Scout test file for each test originally loaded via `loadTestFile`.

### Import Selection

Import from one of these Scout packages:

- `@kbn/scout`: Platform tests (generally tests in `x-pack/platform/test/functional`)
- `@kbn/scout-security`: Security solution tests (generally tests in `x-pack/solutions/security/test/functional`)
- `@kbn/scout-oblt`: Observability solution tests (generally tests in `x-pack/solutions/observability/test/functional`)

For API tests, import `apiTest` instead of `test`. If the path is ambiguous, infer from test content.

## Migration rules

- Preserve all `describe` nesting and hierarchy
- Convert `describe()` to `test.describe()` or `apiTest.describe()`
- Convert `it` to `test()`or `apiTest()`
- Preserve `.skip()`, `.only()` modifiers as-is
- Keep all test suite tags
- Preserve test titles exactly as written - do not modify or rephrase

### Hooks

- `before()` to `test.beforeAll()` or `apiTest.beforeAll()`
- `after()` to `test.afterAll()` or `apiTest.afterAll()`
- `beforeEach()` to `test.beforeEach()` or `apiTest.beforeEach()`
- `afterEach()` to `test.afterEach()` or `apiTest.afterEach()`

### Fixtures

Deconstruct fixtures based on test type and clear need.

- API tests are likely going to need `kbnClient` and `apiClient` (a complete list will be provided separately).
- Functional tests will likely need `page`, `pageObjects`, `browserAuth`, and `kbnClient` (a complete list will be provided separately).

**When in doubt, include the fixture** - it's better to include a fixture that might be needed than to omit one that is necessary. Only exclude fixtures that are clearly not used.

### TODO comments

Add a single TODO comment block at the start of each test/hook body with numbered implementation steps. Be specific about what the original test did. When converting an API test, include, if possible, the complete endpoint under test.

## Examples

A test is considered an API test if it:

- Makes HTTP requests to Kibana/ES APIs directly
- Does not use browser automation (no `page` fixture)
- Typically located in `**/api_integration/**` directories

A test is a UI test if it:

- Uses browser automation (`page`, `pageObjects`)
- Tests user interactions and visual elements
- Typically located in `**/functional/**` directories

### API Test Migration

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, apiTest, tags } from '@kbn/scout-oblt';

apiTest.describe('AddProjectMonitors', { tag: tags.stateful.all }, () => {
  apiTest.beforeAll(async ({ kbnClient, apiClient }) => {
    // TODO: Implement test setup
    // 1. Clean standard saved objects list
    // 2. Enable Synthetics via PUT request to SYNTHETICS_ENABLEMENT endpoint
    // 3. Install Synthetics package
    // 4. Create private location
    // 5. Create global test parameters (testGlobalParam, testGlobalParam2)
  });

  apiTest.beforeEach(async ({ apiClient }) => {
    // TODO: Implement test setup
    // 1. Generate unique IDs for project monitors
    // 2. Set up projectMonitors with browser monitor fixtures
    // 3. Set up httpProjectMonitors with http monitor fixtures
  });

  apiTest(
    'project monitors - saves space as data stream namespace',
    async ({ apiClient, kbnClient }) => {
      // TODO: Implement test
      // 1. Create test project with unique ID
      // 2. Create test space with unique ID and name
      // 3. Create synthetics_admin role with uptime:all permissions for all spaces
      // 4. Create test user with synthetics_admin role
      // 5. PUT request to update project monitors in test space
      // 6. GET request to verify monitor was created
      // 7. Verify monitors array length equals 1
      // 8. Verify monitor namespace equals formatted space ID
      // 9. Cleanup: delete monitor, user, and role
    }
  );

  apiTest(
    'project monitors - browser - handles custom namespace',
    async ({ apiClient, kbnClient }) => {
      // TODO: Implement test
      // 1. Create test project and space with unique IDs
      // 2. Define custom namespace as 'custom.namespace'
      // 3. Create synthetics_admin role with uptime:all permissions
      // 4. Create test user with role
      // 5. PUT request to update monitor with custom namespace
      // 6. GET request to verify monitor creation
      // 7. Verify monitor namespace equals custom namespace
      // 8. Cleanup: delete monitor, user, role
    }
  );

  apiTest(
    'project monitors - lightweight - handles custom namespace',
    async ({ apiClient, kbnClient }) => {
      // TODO: Implement test
      // 1. Create test project and space with unique IDs
      // 2. Define custom namespace as 'custom.namespace'
      // 3. Create synthetics_admin role with uptime:all permissions
      // 4. Create test user with role
      // 5. PUT request to update HTTP monitor with custom namespace
      // 6. GET request to verify monitor creation
      // 7. Verify monitor namespace equals custom namespace
      // 8. Cleanup: delete monitor, user, role
    }
  );

  apiTest(
    'project monitors - cannot update project monitors when user does not have access to all spaces using * in spaces',
    async ({ apiClient, kbnClient }) => {
      // TODO: Implement test
      // 1. Create test project with unique ID
      // 2. Create two test spaces (SPACE_ID_1, SPACE_ID_2)
      // 3. Create role with access only to SPACE_ID_1
      // 4. Create test user with limited role
      // 5. Attempt to create monitor with spaces: ['*']
      // 6. Verify request returns 403 status
      // 7. Verify error message about insufficient permissions
      // 8. Cleanup: delete monitor, user, role, spaces
    }
  );

  apiTest(
    'project monitors - user with access to all spaces can specify * in spaces and monitor is created in all spaces',
    async ({ apiClient, kbnClient }) => {
      // TODO: Implement test
      // 1. Create test project with unique ID
      // 2. Create two test spaces (SPACE_ID_1, SPACE_ID_2)
      // 3. Create role with access to all spaces (spaces: ['*'])
      // 4. Create test user with admin role
      // 5. Create HTTP monitor with spaces: ['*']
      // 6. PUT request to create monitor in SPACE_ID_1 context
      // 7. Verify response shows monitor was created
      // 8. Use savedObjects client to verify monitor exists in all spaces
      // 9. Verify monitor namespaces equals '*'
      // 10. Cleanup: delete user, role, spaces
    }
  );
});
```

### UI Test Migration

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, test } from '@kbn/scout';

test.describe('filter by map extent', () => {
  test.beforeAll(async ({ kbnClient, browserAuth, pageObjects }) => {
    // TODO: Implement test setup
    // 1. Set user roles: ['test_logstash_reader', 'global_maps_all', 'global_dashboard_all']
    // 2. Navigate to dashboard app
    // 3. Go to 'filter by map extent dashboard' in edit mode
    // 4. Wait for loading to finish
    // 5. Wait for dashboard to render completely
  });

  test.afterAll(async ({ kbnClient }) => {
    // TODO: Implement cleanup
    // 1. Restore user defaults
  });

  test('should not filter dashboard by map extent before "filter by map extent" is enabled', async ({
    page,
    pageObjects,
  }) => {
    // TODO: Implement test
    // 1. Assert legacy metric shows 'Count of records' with value '6'
  });

  test('should filter dashboard by map extent when "filter by map extent" is enabled', async ({
    page,
    pageObjects,
  }) => {
    // TODO: Implement test
    // 1. Click panel action 'FILTER_BY_MAP_EXTENT' on 'document example' panel
    // 2. Set EUI switch 'filterByMapExtentSwitch24ade730-afe4-42b6-919a-c4e0a98c94f2' to 'check'
    // 3. Press ESCAPE key to close panel
    // 4. Wait for loading to finish
    // 5. Assert legacy metric shows 'Count of records' with value '1'
  });

  test('should filter dashboard by new map extent when map is moved', async ({
    page,
    pageObjects,
  }) => {
    // TODO: Implement test
    // 1. Set map view to coordinates (32.95539, -93.93054) with zoom level 5
    // 2. Wait for loading to finish
    // 3. Assert legacy metric shows 'Count of records' with value '2'
  });

  test('should remove map extent filter dashboard when "filter by map extent" is disabled', async ({
    page,
    pageObjects,
  }) => {
    // TODO: Implement test
    // 1. Click panel action 'FILTER_BY_MAP_EXTENT' on 'document example' panel
    // 2. Set EUI switch 'filterByMapExtentSwitch24ade730-afe4-42b6-919a-c4e0a98c94f2' to 'uncheck'
    // 3. Press ESCAPE key to close panel
    // 4. Wait for loading to finish
    // 5. Assert legacy metric shows 'Count of records' with value '6'
  });
});
```

## Output Format

### File creation

You can create Scout files under the `<plugin-path>/test/scout/ui/tests` folder. You must also create a Playwright config at `<plugin-path>/test/scout/ui/playwright.config.ts`. The Playwright config will look like this:

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// update Scout package import based on plugin's file path
import { createPlaywrightConfig } from '@kbn/scout';

export default createPlaywrightConfig({
  testDir: './tests',
});
```

IMPORTANT: you can make changes to the codebase if necessary. Create one or more files.

Structure your response like this:

1. Summary (one sentence describing the migration. Example: "Migrated 5 test cases from FTR to Scout")
2. Code: complete Scout test file(s) with license header
3. Notes: brief explanation of decisions made. Keep explanations concise - focus on non-obvious decisions only:

- Which Scout package was chosen and why
- Any notable structural changes
- Any ambiguities or assumptions made

4. Missing information: if you don't know how to handle a specific scenario, or if you think the prompt lacks details, mention it in this section so we can improve the prompt. This will help tremendously, so you're encouraged to provide a brief explanation of the improvements to the migration tool.
