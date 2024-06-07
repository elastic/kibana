/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import globby from 'globby';
import path from 'path';

export interface Options {
  additionalIgnore?: string[];
  mark?: boolean;
  absolute?: boolean;
}

export async function globNamespacePaths(namespaceRoot: string, options: Options = {}) {
  const { additionalIgnore = [], mark = false, absolute = false } = options;
  const ignore = [
    '**/node_modules/**',
    '**/__tests__/**',
    '**/dist/**',
    '**/target/**',
    '**/vendor/**',
    '**/build/**',
    '**/*.test.{js,jsx,ts,tsx}',
    '**/*.d.ts',
  ]
    .concat(additionalIgnore)
    .map((i) => `!${i}`);

  const entries = await globby(['*.{js,jsx,ts,tsx}', ...ignore], {
    cwd: namespaceRoot,
    baseNameMatch: true,
    markDirectories: mark,
    absolute,
  });

  return entries.map((entry) => path.resolve(namespaceRoot, entry));
}
