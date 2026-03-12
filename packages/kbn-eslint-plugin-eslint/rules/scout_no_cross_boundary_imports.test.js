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

// Solution plugin test files
const SECURITY_TEST = 'x-pack/solutions/security/plugins/my-plugin/test/scout/ui/some_test.ts';
const OBLT_TEST = 'x-pack/solutions/observability/plugins/my-plugin/test/scout_api/some_test.ts';

// Platform plugin test files
const PLATFORM_XPACK_TEST = 'x-pack/platform/plugins/security/test/scout/ui/some_test.ts';
const PLATFORM_SRC_TEST = 'src/platform/plugins/shared/discover/test/scout_ui/some_test.ts';

// Unrelated file (not a Scout test)
const UNRELATED = 'x-pack/solutions/security/plugins/my-plugin/server/index.ts';

ruleTester.run('@kbn/eslint/scout_no_cross_boundary_imports', rule, {
  valid: [
    // Files outside Scout test directories are ignored
    {
      filename: UNRELATED,
      code: `import { something } from '@kbn/scout';
import { other } from '@kbn/scout-security';`,
    },

    // Non-Scout imports are always fine
    {
      filename: SECURITY_TEST,
      code: `import { something } from 'lodash';`,
    },

    // Solution test importing from its own package (direct and subpath)
    {
      filename: SECURITY_TEST,
      code: `import { test } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';`,
    },
    {
      filename: OBLT_TEST,
      code: `import { expect } from '@kbn/scout-oblt/api';`,
    },

    // Platform test importing from @kbn/scout (direct and subpath)
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
    // Solution test importing from platform @kbn/scout
    {
      filename: SECURITY_TEST,
      code: `import { test } from '@kbn/scout';`,
      errors: [{ messageId: 'solutionTestImport' }],
    },

    // Solution test importing from another solution's package
    {
      filename: SECURITY_TEST,
      code: `import { something } from '@kbn/scout-oblt';`,
      errors: [{ messageId: 'solutionTestImport' }],
    },

    // Solution test with multiple violations (platform + cross-solution)
    {
      filename: OBLT_TEST,
      code: `import { expect } from '@kbn/scout/ui';
import { something } from '@kbn/scout-security';`,
      errors: [{ messageId: 'solutionTestImport' }, { messageId: 'solutionTestImport' }],
    },

    // Platform test (x-pack) importing from solution package
    {
      filename: PLATFORM_XPACK_TEST,
      code: `import { test } from '@kbn/scout-security';`,
      errors: [{ messageId: 'platformTestImport' }],
    },

    // Platform test (src/) importing from solution package
    {
      filename: PLATFORM_SRC_TEST,
      code: `import { test } from '@kbn/scout-search';`,
      errors: [{ messageId: 'platformTestImport' }],
    },
  ],
});
