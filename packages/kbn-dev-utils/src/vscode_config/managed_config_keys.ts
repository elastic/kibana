/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaJsonSchema } from '@kbn/kibana-json-schema';

export interface ManagedConfigKey {
  key: string;
  value: string | Record<string, any> | boolean | number;
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
      ['**/.chromium']: true,
      ['**/.es']: true,
      ['**/.eslintcache']: true,
      ['**/.yarn-local-mirror']: true,
      ['**/*.log']: true,
      ['**/api_docs']: true,
      ['**/bazel-*']: true,
      ['**/node_modules']: true,
      ['**/packages/kbn-pm/dist/index.js']: true,
      ['**/target']: true,
    },
  },
  {
    key: 'search.exclude',
    value: {
      ['**/packages/kbn-pm/dist/index.js']: true,
      ['**/api_docs']: true,
      ['**/tsconfig.tsbuildinfo']: true,
      ['**/*.map']: true,
    },
  },
  {
    key: 'typescript.tsdk',
    // we use a relative path here so that it works with remote vscode connections
    value: './node_modules/typescript/lib',
  },
  {
    key: 'typescript.enablePromptUseWorkspaceTsdk',
    value: true,
  },
  {
    key: 'git.autoRepositoryDetection',
    value: false,
  },
  {
    key: 'typescript.tsserver.maxTsServerMemory',
    value: 4096,
  },
  {
    key: 'json.schemas',
    value: [
      {
        fileMatch: ['kibana.json'],
        url: './.vscode/kibana-json-schema.json',
      },
    ],
  },
];

export const MANAGED_CONFIG_FILES = [
  { name: 'kibana-json-schema.json', content: JSON.stringify(KibanaJsonSchema, null, 2) },
];
