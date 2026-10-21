/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OxlintOverride } from 'oxlint';

export const banOverrides: OxlintOverride[] = [
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // Old tslint yml override or defined rules
      'ban/ban': [
        'error',
        { name: ['describe', 'only'], message: 'No exclusive suites.' },
        { name: ['it', 'only'], message: 'No exclusive tests.' },
        { name: ['test', 'only'], message: 'No exclusive tests.' },
        { name: ['testSuggestions', 'only'], message: 'No exclusive tests.' },
        { name: ['testErrorsAndWarnings', 'only'], message: 'No exclusive tests.' },
      ],
    },
  },
];
