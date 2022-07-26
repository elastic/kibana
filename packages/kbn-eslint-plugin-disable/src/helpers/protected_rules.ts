/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// this configures the protected eslint rules on our codebase that can't be disabled
//
// rule_name: * => will make it impossible for rule_name to be eslint disabled
export const PROTECTED_RULES = {
  '@kbn/disable/no_protected_eslint_disable': '*',
  '@kbn/disable/no_naked_eslint_disable': '*',
  '@kbn/imports/no_unused_imports': '*',
};
