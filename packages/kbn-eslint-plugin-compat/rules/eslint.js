/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { builtinRules } = require('eslint/use-at-your-own-risk');

// ESLint core rules that oxlint doesn't implement.
module.exports = Object.fromEntries(
  [
    'camelcase',
    'consistent-return',
    'no-restricted-modules',
    'no-restricted-syntax',
    'no-undef-init',
    'padding-line-between-statements',
    'require-atomic-updates',
    'spaced-comment',
    'strict',
  ].map((name) => [`eslint-${name}`, builtinRules.get(name)])
);
