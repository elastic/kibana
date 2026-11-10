/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { rules } = require('@typescript-eslint/eslint-plugin');

// @typescript-eslint rules that oxlint doesn't implement. They run without type information, as
// in ESLint, so options that need it (`naming-convention`'s `types`) aren't supported.
module.exports = {
  'typescript-member-ordering': rules['member-ordering'],
  'typescript-naming-convention': rules['naming-convention'],
};
