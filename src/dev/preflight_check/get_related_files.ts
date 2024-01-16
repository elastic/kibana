/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import dependencyTree from 'dependency-tree';
import { dirname } from 'node:path';
import { findFileUpwards } from './find_file_upwards';

export async function getRelatedFiles({ path }: { path: string }) {
  const tsConfigForFile = await findFileUpwards(dirname(path), 'tsconfig.json');

  if (!tsConfigForFile) return;

  return new Promise((resolve, reject) => {
    try {
      resolve(
        dependencyTree({
          filename: path,
          directory: dirname(tsConfigForFile),
          tsConfig: tsConfigForFile,
          filter: (p) => p.indexOf('node_modules') === -1, // optional
        })
      );
    } catch (error) {
      reject(error);
    }
  });
}
