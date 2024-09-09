/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { camelCase } from 'lodash';
import path from 'path';
import { getPkgDirMap } from '@kbn/repo-packages';
import { REPO_ROOT } from '@kbn/repo-info';

export function getAppName(fileName: string, cwd: string) {
  const { dir } = path.parse(fileName);
  const relativePathToFile = dir.replace(cwd, '');

  const packageDirs = Array.from(
    Array.from(getPkgDirMap(REPO_ROOT).values()).reduce((acc, currentDir) => {
      const topDirectory = currentDir.normalizedRepoRelativeDir.split('/')[0];

      if (topDirectory) {
        acc.add(topDirectory);
      }

      return acc;
    }, new Set<string>())
  );

  const relativePathArray = relativePathToFile.split('/');

  const appName = camelCase(
    packageDirs.reduce((acc, repoPath) => {
      if (!relativePathArray[1]) return '';

      if (relativePathArray[1] === 'x-pack') {
        if (relativePathArray[3] === 'observability_solution') {
          return relativePathArray[4];
        }
        return relativePathArray[3];
      }

      if (relativePathArray[1].includes(repoPath)) {
        return relativePathArray[2];
      }

      return acc;
    }, '')
  );

  return appName === 'observability' ? 'o11y' : appName;
}
