/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OxlintOverride } from 'oxlint';

export const cypressOverrides: OxlintOverride[] = [
  {
    files: [
      'x-pack/solutions/security/test/security_solution_cypress/cypress/**',
      'x-pack/solutions/security/plugins/security_solution/public/management/cypress/**',
    ],
    rules: {
      // `plugin:cypress/recommended`
      'cypress/no-assigning-return-values': 'error',
      'cypress/no-async-tests': 'error',
      'cypress/no-unnecessary-waiting': 'error',
      'cypress/unsafe-to-chain-command': 'error',

      'cypress/no-force': 'warn',
    },
  },
];
