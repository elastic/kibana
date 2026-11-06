/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('../oxlint_plugin').rules.no_browser_imports_in_server;

const MESSAGE = 'Browser-only UI libraries must not load in the Kibana server.';

const OPTIONS = [
  {
    patterns: [
      {
        group: ['@elastic/eui', '@elastic/eui/**', 'react-dom', 'react-dom/**'],
        allowTypeImports: true,
        message: MESSAGE,
      },
    ],
  },
];

const tsRuleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
  },
});

// The rule is typescript-eslint's `no-restricted-imports`; these cases prove the
// configuration shape used by the server override behaves as intended, in
// particular that type-only imports stay allowed while value imports (including
// deep paths) are flagged.
tsRuleTester.run('@kbn/eslint/no_browser_imports_in_server', rule, {
  valid: [
    {
      code: "import type { EuiThemeComputed } from '@elastic/eui';",
      options: OPTIONS,
    },
    {
      code: "import { colorVis } from '@elastic/eui-theme-borealis';",
      options: OPTIONS,
    },
    {
      code: "import { euiPaletteColorBlind } from '@elastic/eui-theme-common';",
      options: OPTIONS,
    },
  ],
  invalid: [
    {
      code: "import { EuiBadge } from '@elastic/eui';",
      options: OPTIONS,
      errors: [{ messageId: 'patternWithCustomMessage' }],
    },
    {
      code: "import { euiPaletteColorBlind } from '@elastic/eui/lib/services/color/eui_palettes';",
      options: OPTIONS,
      errors: [{ messageId: 'patternWithCustomMessage' }],
    },
    {
      code: "import { renderToString } from 'react-dom/server';",
      options: OPTIONS,
      errors: [{ messageId: 'patternWithCustomMessage' }],
    },
    {
      // a value import that also imports types is still a runtime load
      code: "import { EuiBadge, type EuiBadgeProps } from '@elastic/eui';",
      options: OPTIONS,
      errors: [{ messageId: 'patternWithCustomMessage' }],
    },
  ],
});
