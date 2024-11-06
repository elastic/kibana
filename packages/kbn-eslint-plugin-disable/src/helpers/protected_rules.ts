/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// this configures the protected eslint rules on our codebase that can't be disabled
export const PROTECTED_RULES = new Set([
  '@kbn/disable/no_protected_eslint_disable',
  '@kbn/disable/no_naked_eslint_disable',
  '@kbn/imports/no_unused_imports',
]);
