/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Every rule enabled here (and in ./.oxlint/*.mts) is intentionally absent from
// `@kbn/eslint-config` so each rule runs in exactly one linter. When enabling a rule here,
// delete it from packages/kbn-eslint-config/*.js; when removing one, add it back there.
// A rule whose ESLint options are stricter than oxlint's implementation must stay in ESLint.
//
// The config must stay at the repo root: oxlint resolves `files` and `ignorePatterns` globs
// relative to this file. Rule sets are spread rather than passed through `extends`, which
// drops rule options in oxlint (https://github.com/oxc-project/oxc/issues/22230).

import { defineConfig, type OxlintConfig } from 'oxlint';

import { javascriptRules } from './.oxlint/javascript.mts';
import { typescriptRules } from './.oxlint/typescript.mts';
import { jestRules } from './.oxlint/jest.mts';
import { reactRules } from './.oxlint/react.mts';
import { kibanaOverrides, kibanaRules } from './.oxlint/kibana.mts';
import { licenseHeaderOverrides } from './.oxlint/license_headers.mts';
import { scoutOverrides } from './.oxlint/scout.mts';

export default defineConfig<OxlintConfig>({
  plugins: ['react', 'typescript', 'import', 'jsx-a11y', 'react-perf', 'node', 'jest'],
  jsPlugins: [
    {
      name: '@kbn/eslint',
      specifier: './packages/kbn-eslint-plugin-eslint/oxlint_plugin.js',
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
  overrides: [...licenseHeaderOverrides, ...kibanaOverrides, ...scoutOverrides],
  // oxlint's parser rejects TypeScript grammar errors (TS1016: required parameter after an
  // optional one) that ESLint's parser and tsc's `skipLibCheck` let through in this declaration.
  ignorePatterns: [
    'x-pack/solutions/security/test/security_solution_cypress/cypress/support/index.d.ts',
    'src/platform/packages/shared/kbn-flot-charts/lib/**',
  ],
});
