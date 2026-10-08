/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Every rule enabled here (and in the sibling modules) is intentionally absent from
// `@kbn/eslint-config` so each rule runs in exactly one linter. When enabling a rule here,
// delete it from packages/kbn-eslint-config/*.js; when removing one, add it back there.
// A rule whose ESLint options are stricter than oxlint's implementation must stay in ESLint.
//
// oxlint loads this through the repo-root `oxlint.config.mjs` and resolves `files`,
// `ignorePatterns`, and `jsPlugins` paths relative to that root entry. Rule sets are spread
// rather than passed through `extends`, which drops rule options in oxlint
// (https://github.com/oxc-project/oxc/issues/22230).

import { defineConfig, type OxlintConfig } from 'oxlint';

import { javascriptRules } from './javascript.mts';
import { typescriptRules } from './typescript.mts';
import { jestRules } from './jest.mts';
import { reactRules } from './react.mts';
import { kibanaOverrides, kibanaRules } from './kibana.mts';
import { licenseHeaderOverrides } from './license_headers.mts';
import { scoutOverrides } from './scout.mts';
import { securityImportsOverrides } from './security_imports.mts';

export default defineConfig<OxlintConfig>({
  plugins: ['react', 'typescript', 'import', 'jsx-a11y', 'react-perf', 'node', 'jest'],
  jsPlugins: [
    {
      name: '@kbn/eslint',
      specifier: './packages/kbn-eslint-plugin-eslint/oxlint_plugin.js',
    },
    {
      name: '@kbn/disable',
      specifier: './packages/kbn-eslint-plugin-disable/oxlint_plugin.js',
    },
  ],
  categories: {
    correctness: 'off',
  },
  rules: {
    ...javascriptRules,
    ...typescriptRules,
    ...jestRules,
    ...reactRules,
    ...kibanaRules,
  },
  overrides: [
    ...licenseHeaderOverrides,
    ...kibanaOverrides,
    ...scoutOverrides,
    ...securityImportsOverrides,
  ],
  // oxlint's parser rejects TypeScript grammar errors (TS1016: required parameter after an
  // optional one) that ESLint's parser and tsc's `skipLibCheck` let through in this declaration.
  ignorePatterns: [
    'x-pack/solutions/security/test/security_solution_cypress/cypress/support/index.d.ts',
    'src/platform/packages/shared/kbn-flot-charts/lib/**',
  ],
});
