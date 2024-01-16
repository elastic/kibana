/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import dependencyTree from 'dependency-tree';
import { flatMapDeep } from 'lodash';
import { dirname } from 'node:path';
import { findFileUpwards } from './find_file_upwards';

interface NestedObject {
  [key: string]: NestedObject | undefined;
}

function flattenObject(obj: NestedObject, depth: number): string[] {
  return flatMapDeep(obj, (value, key) => {
    if (depth > 1 && value && typeof value === 'object') {
      return flattenObject(value, depth - 1).map((nestedKey) => `${key}.${nestedKey}`);
    } else {
      return key;
    }
  });
}
export async function getRelatedFiles({ path }: { path: string }): Promise<string[]> {
  const tsConfigForFile = await findFileUpwards(dirname(path), 'tsconfig.json');

  return new Promise((resolve, reject) => {
    try {
      if (!tsConfigForFile) {
        return reject(`Could not find tsconfig.json for ${path}`);
      }

      resolve(
        dependencyTree({
          filename: path,
          directory: dirname(tsConfigForFile),
          tsConfig: tsConfigForFile,
          filter: (p) => p.indexOf('node_modules') === -1,
        })
      );
    } catch (error) {
      reject(error);
    }
  }).then((tree) => {
    return tree && typeof tree === 'object' ? flattenObject(tree as NestedObject, 2) : [];
  });
}
