/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const getProtectedRules = function (): { [key: string]: string | string[] } {
  // this configures the rules to protect.
  // rule_name: * => protected on every file
  // rule_name: [] => only protected on the paths included (it can be a folder or a specific file)
  return {
    '@kbn/disable/no_protected_eslint_disable': '*',
    '@kbn/imports/no_unused_imports': '*',
  };
};
