/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { resolve } from 'path';

interface SearchOptions {
  rootDir: string;
  oss: boolean;
  examples: boolean;
}

export function getPluginSearchPaths({ rootDir, oss, examples }: SearchOptions) {
  return [
    resolve(rootDir, 'src', 'plugins'),
    ...(oss ? [] : [resolve(rootDir, 'x-pack', 'plugins')]),
    resolve(rootDir, 'plugins'),
    ...(examples ? [resolve(rootDir, 'examples')] : []),
    ...(examples && !oss ? [resolve(rootDir, 'x-pack', 'examples')] : []),
    resolve(rootDir, '..', 'kibana-extra'),
  ];
}
