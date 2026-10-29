/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OxlintOverride } from 'oxlint';

/** FormatJS linter for i18n code: https://formatjs.io/docs/tooling/linter */
export const formatjsOverrides: OxlintOverride[] = [
  {
    files: ['{src,x-pack,packages}/**/*.{js,mjs,ts,tsx}'],
    rules: {
      'formatjs/enforce-default-message': ['error', 'anything'],
    },
  },
];
