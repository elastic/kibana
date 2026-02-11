/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('./scout_no_cross_boundary_imports');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018,
  },
});

// Solution Scout package files
const SECURITY_SRC =
  'x-pack/solutions/security/packages/kbn-scout-security/src/playwright/fixtures/test/page_objects/alerts_table.ts';
const SECURITY_BRIDGE = 'x-pack/solutions/security/packages/kbn-scout-security/index.ts';
const OBLT_SRC =
  'x-pack/solutions/observability/packages/kbn-scout-oblt/src/playwright/page_objects/custom_logs.ts';

// Platform Scout package file
const PLATFORM_SRC = 'src/platform/packages/shared/kbn-scout/src/playwright/fixtures/test.ts';

// Plugin test files
const SECURITY_TEST = 'x-pack/solutions/security/plugins/my-plugin/test/scout/ui/some_test.ts';
const PLATFORM_XPACK_TEST = 'x-pack/platform/plugins/security/test/scout/ui/some_test.ts';
const PLATFORM_SRC_TEST = 'src/platform/plugins/shared/discover/test/scout_ui/some_test.ts';

// Unrelated file (not in any Scout package or test)
const UNRELATED = 'x-pack/solutions/security/plugins/my-plugin/server/index.ts';

ruleTester.run('@kbn/eslint/scout_no_cross_boundary_imports', rule, {
  valid: [
    // Files outside Scout boundaries are ignored
    {
      filename: UNRELATED,
      code: `import { something } from '@kbn/scout';
import { other } from '@kbn/scout-security';`,
    },

    // Non-Scout imports are always fine
    {
      filename: SECURITY_SRC,
      code: `import { something } from 'lodash';`,
    },

    // Solution bridge files CAN re-export from platform (including subpaths)
    {
      filename: SECURITY_BRIDGE,
      code: `export { lighthouseTest, tags } from '@kbn/scout';
export * from '@kbn/scout/src/playwright/eui_components';`,
    },

    // Solution src/ files CAN import from own solution package
    {
      filename: SECURITY_SRC,
      code: `import { expect } from '@kbn/scout-security/ui';`,
    },

    // Platform CAN use its own package
    {
      filename: PLATFORM_SRC,
      code: `import { something } from '@kbn/scout/src/utils';`,
    },

    // Test files importing from their correct Scout package
    {
      filename: SECURITY_TEST,
      code: `import { test } from '@kbn/scout-security';`,
    },
    {
      filename: PLATFORM_XPACK_TEST,
      code: `import { expect } from '@kbn/scout/ui';`,
    },
    {
      filename: PLATFORM_SRC_TEST,
      code: `import { test } from '@kbn/scout';`,
    },
  ],

  invalid: [
    // Cross-solution: security → observability
    {
      filename: SECURITY_SRC,
      code: `import type { ObltPageObjects } from '@kbn/scout-oblt';`,
      errors: [{ messageId: 'crossSolutionImport' }],
    },
    // Cross-solution: observability → security (verifies second solution)
    {
      filename: OBLT_SRC,
      code: `import { something } from '@kbn/scout-security';`,
      errors: [{ messageId: 'crossSolutionImport' }],
    },
    // Cross-solution from bridge file (also forbidden)
    {
      filename: SECURITY_BRIDGE,
      code: `import { something } from '@kbn/scout-oblt';`,
      errors: [{ messageId: 'crossSolutionImport' }],
    },

    // Solution src/ → platform (direct and subpath)
    {
      filename: SECURITY_SRC,
      code: `import { test as baseTest, mergeTests } from '@kbn/scout';`,
      errors: [{ messageId: 'solutionToPlatformImport' }],
    },
    {
      filename: SECURITY_SRC,
      code: `import { test } from '@kbn/scout/ui';`,
      errors: [{ messageId: 'solutionToPlatformImport' }],
    },

    // Platform → solution
    {
      filename: PLATFORM_SRC,
      code: `import { test } from '@kbn/scout-security';`,
      errors: [{ messageId: 'platformToSolutionImport' }],
    },

    // Solution test → wrong packages (platform and cross-solution)
    {
      filename: SECURITY_TEST,
      code: `import { expect } from '@kbn/scout/ui';
import { something } from '@kbn/scout-oblt';`,
      errors: [{ messageId: 'wrongTestImport' }, { messageId: 'wrongTestImport' }],
    },

    // Platform test (x-pack) → solution package
    {
      filename: PLATFORM_XPACK_TEST,
      code: `import { test } from '@kbn/scout-security';`,
      errors: [{ messageId: 'wrongTestImport' }],
    },
    // Platform test (src/) → solution package
    {
      filename: PLATFORM_SRC_TEST,
      code: `import { test } from '@kbn/scout-search';`,
      errors: [{ messageId: 'wrongTestImport' }],
    },

    // Multiple violations in one file (cross-boundary + cross-solution)
    {
      filename: SECURITY_SRC,
      code: `import type { ScoutPage } from '@kbn/scout';
import { something } from '@kbn/scout-oblt';`,
      errors: [{ messageId: 'solutionToPlatformImport' }, { messageId: 'crossSolutionImport' }],
    },
  ],
});
