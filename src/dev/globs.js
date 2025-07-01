/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import path from 'path';
import minimatch from 'minimatch';

export function matchesAnyGlob(path, globs) {
  return globs.some((pattern) =>
    minimatch(path, pattern, {
      dot: true,
    })
  );
}

export function readGitignore(rootPath) {
  const gitignorePath = path.join(rootPath, '.gitignore');
  try {
    return fs
      .readFileSync(gitignorePath, 'utf8')
      .split('\n')
      .filter((line) => line.trim() && !line.startsWith('#'))
      .map((line) => line.trim());
  } catch (error) {
    return [];
  }
}
