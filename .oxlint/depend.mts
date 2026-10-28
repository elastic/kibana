/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DummyRuleMap, OxlintOverride } from 'oxlint';

export const dependRules: DummyRuleMap = {
  // Suggests better replacements for packages: https://github.com/es-tooling/module-replacements/tree/main/docs/modules
  'depend/ban-dependencies': [
    'error',
    {
      allowed: [
        '^@kbn/*', // internal packages
        'lodash', // https://github.com/es-tooling/module-replacements/blob/main/docs/modules/lodash-underscore.md
        'moment', // https://github.com/es-tooling/module-replacements/blob/main/docs/modules/momentjs.md
        'jquery', // https://github.com/es-tooling/module-replacements/blob/main/docs/modules/jquery.md
      ],
    },
  ],
};

export const dependOverrides: OxlintOverride[] = [
  {
    // Re-exports the rules of the ESLint plugins Kibana already lints with, so it has to load them.
    files: ['packages/kbn-eslint-plugin-compat/**'],
    rules: {
      'depend/ban-dependencies': 'off',
    },
  },
];
