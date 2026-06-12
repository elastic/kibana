/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { camelCase } from 'lodash';
import { basename, parse } from 'path';
import { getPkgDirMap } from '@kbn/repo-packages';
import { REPO_ROOT } from '@kbn/repo-info';

const APP_ALIASES: Record<string, string> = {
  observability: 'o11y',
};

export function getAppName(fileName: string, cwd: string) {
  const { dir } = parse(fileName);
  const relativePathToFile = dir.replace(cwd, '');

  const allPaths = Array.from(getPkgDirMap(REPO_ROOT).values())
    .map((module) => module.directory.replace(REPO_ROOT, ''))
    .sort((a, b) => b.length - a.length);

  const moduleDir = allPaths.find((path) => relativePathToFile.startsWith(path)) ?? '';
  const moduleBasename = camelCase(basename(moduleDir));
  return APP_ALIASES[moduleBasename] ?? moduleBasename;
}
