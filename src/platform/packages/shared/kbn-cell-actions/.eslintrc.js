/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// eslint-disable-next-line import/no-extraneous-dependencies
const { createNoRestrictedImportsOverride } = require('@kbn/eslint-rule-overrides');

const RESTRICTED_IMPORTS = [
  {
    name: 'enzyme',
    message: 'Please use @testing-library/react instead',
  },
];

const overrides = createNoRestrictedImportsOverride({
  childConfigDir: __dirname,
  restrictedImports: RESTRICTED_IMPORTS,
});

/** @type {import('eslint').Linter.Config} */
module.exports = {
  overrides,
};
