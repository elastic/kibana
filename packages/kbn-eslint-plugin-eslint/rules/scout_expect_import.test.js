/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('./scout_expect_import');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018,
  },
});

// Solutions test files
const OBLT_API_FILE =
  'x-pack/solutions/observability/plugins/apm/test/scout/api/tests/example.spec.ts';
const OBLT_UI_FILE =
  'x-pack/solutions/observability/plugins/apm/test/scout/ui/tests/example.spec.ts';

// Platform test files
const PLATFORM_API_FILE = 'src/platform/plugins/example/test/scout/api/tests/example.spec.ts';

ruleTester.run('@kbn/eslint/scout_expect_import', rule, {
  valid: [
    // Solutions: correct imports
    {
      filename: OBLT_API_FILE,
      code: `import { expect } from '@kbn/scout-oblt/api';`,
    },
    {
      filename: OBLT_UI_FILE,
      code: `import { expect } from '@kbn/scout-oblt/ui';`,
    },
    // Platform: correct import
    {
      filename: PLATFORM_API_FILE,
      code: `import { expect } from '@kbn/scout/api';`,
    },
    // Non-expect imports are ignored
    {
      filename: OBLT_API_FILE,
      code: `import { test } from '@kbn/scout-oblt';`,
    },
    // Files outside scout directories are ignored
    {
      filename:
        'x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/graph_investigation/search_filters.test.ts',
      code: `import { expect } from 'expect';`,
    },
  ],

  invalid: [
    // Multi-import: different source paths (missing suffix, wrong suffix, external package)
    {
      filename: OBLT_API_FILE,
      code: `import { test, expect, page } from '@kbn/scout-oblt';`,
      output: `import { test, page } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';`,
      errors: [{ messageId: 'wrongImportPath' }],
    },
    {
      filename: OBLT_UI_FILE,
      code: `import { expect, test } from '@kbn/scout-oblt/api';`,
      output: `import { test } from '@kbn/scout-oblt/api';
import { expect } from '@kbn/scout-oblt/ui';`,
      errors: [{ messageId: 'wrongImportPath' }],
    },
    {
      filename: OBLT_API_FILE,
      code: `import { test, expect } from '@playwright/test';`,
      output: `import { test } from '@playwright/test';
import { expect } from '@kbn/scout-oblt/api';`,
      errors: [{ messageId: 'wrongImportPath' }],
    },
    // Platform: single import (multi-import behavior already covered above)
    {
      filename: PLATFORM_API_FILE,
      code: `import { expect } from '@kbn/scout';`,
      output: `import { expect } from '@kbn/scout/api';`,
      errors: [{ messageId: 'wrongImportPath' }],
    },
    // Existing import: append, duplicate removal, multi-import merge
    {
      filename: OBLT_API_FILE,
      code: `import { test } from '@kbn/scout-oblt/api';
import { expect } from '@playwright/test';`,
      output: `import { test, expect } from '@kbn/scout-oblt/api';
`,
      errors: [{ messageId: 'wrongImportPath' }],
    },
    {
      filename: OBLT_UI_FILE,
      code: `import { test, expect } from '@kbn/scout-oblt/ui';
import { expect } from '@playwright/test';`,
      output: `import { test, expect } from '@kbn/scout-oblt/ui';
`,
      errors: [{ messageId: 'wrongImportPath' }],
    },
    {
      filename: OBLT_API_FILE,
      code: `import { test, page } from '@kbn/scout-oblt/api';
import { page, expect } from '@playwright/test';`,
      output: `import { test, page, expect } from '@kbn/scout-oblt/api';
import { page } from '@playwright/test';`,
      errors: [{ messageId: 'wrongImportPath' }],
    },
    // Alias: single and multi-import
    {
      filename: OBLT_API_FILE,
      code: `import { expect as e } from '@playwright/test';`,
      output: `import { expect as e } from '@kbn/scout-oblt/api';`,
      errors: [{ messageId: 'wrongImportPath' }],
    },
    {
      filename: OBLT_UI_FILE,
      code: `import { test, expect as e } from '@playwright/test';`,
      output: `import { test } from '@playwright/test';
import { expect as e } from '@kbn/scout-oblt/ui';`,
      errors: [{ messageId: 'wrongImportPath' }],
    },
  ],
});
