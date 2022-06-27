/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { REPO_ROOT } from '@kbn/utils';

export function createAbsolutePathSerializer(
  rootPath: string = REPO_ROOT,
  replacement = '<absolute path>'
) {
  return {
    test: (value: any) => typeof value === 'string' && value.startsWith(rootPath),
    serialize: (value: string) => value.replace(rootPath, replacement).replace(/\\/g, '/'),
  };
}
