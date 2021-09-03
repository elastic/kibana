/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface ManagedConfigKey {
  key: string;
  value: Record<string, any>;
}

/**
 * Defines the keys which we overrite in user's vscode config for the workspace. We currently
 * only support object values because that's all we needed to support, but support for non object
 * values should be easy to add.
 */
export const MANAGED_CONFIG_KEYS: ManagedConfigKey[] = [
  {
    key: 'files.watcherExclude',
    value: {
      ['**/.eslintcache']: true,
      ['**/.es']: true,
      ['**/.yarn-local-mirror']: true,
      ['**/.chromium']: true,
      ['**/packages/kbn-pm/dist/index.js']: true,
      ['**/bazel-*']: true,
      ['**/node_modules']: true,
      ['**/target']: true,
      ['**/*.log']: true,
    },
  },
  {
    key: 'search.exclude',
    value: {
      ['**/packages/kbn-pm/dist/index.js']: true,
    },
  },
];
