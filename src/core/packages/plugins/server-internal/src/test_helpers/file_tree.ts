/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve, sep } from 'path';

/** Maps a path to file contents, or to a nested tree for a directory. */
export interface FileTree {
  readonly [path: string]: string | FileTree;
}

/** Writes the files and directories in `tree` under `rootDir`, and throws for any path outside it. */
export const writeFileTree = (rootDir: string, tree: FileTree): void => {
  for (const [name, content] of Object.entries(tree)) {
    const path = resolve(rootDir, name);
    if (!path.startsWith(resolve(rootDir) + sep)) {
      throw new Error(`${path} is outside ${rootDir}`);
    }
    if (typeof content === 'string') {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, content);
    } else {
      mkdirSync(path, { recursive: true });
      writeFileTree(path, content);
    }
  }
};
