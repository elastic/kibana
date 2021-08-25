/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { REPO_ROOT } from '@kbn/utils';

export interface ManagedConfigKey {
  key: string;
  value: any;
}

/**
 * Defines the keys which we overrite in user's vscode config for the workspace
 */
export const MANAGED_CONFIG_KEYS: ManagedConfigKey[] = [
  {
    key: 'files.watcherExclude',
    value: {
      [Path.resolve(REPO_ROOT, '.eslintcache')]: true,
      [Path.resolve('build')]: true,
      [Path.resolve('.es')]: true,
      [Path.resolve('.yarn-local-mirror')]: true,
      [Path.resolve('.chromium')]: true,
      [Path.resolve('data')]: true,
      ['**/bazel-*']: true,
      ['**/node_modules']: true,
      ['**/target']: true,
    },
  },
];
