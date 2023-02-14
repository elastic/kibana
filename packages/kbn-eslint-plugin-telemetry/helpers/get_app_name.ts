/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { camelCase } from 'lodash';
import path from 'path';

const XPACK_DIR_ROOT = '/x-pack/plugins';
const PACKAGES_ROOT = '/packages';

export function getAppName(fileName: string, cwd: string) {
  const { dir } = path.parse(fileName);
  const relativePathToFile = dir.replace(cwd, '');

  const appName = relativePathToFile.includes(XPACK_DIR_ROOT)
    ? relativePathToFile.split(XPACK_DIR_ROOT)[1].split('/')[1]
    : relativePathToFile.includes(PACKAGES_ROOT)
    ? relativePathToFile.split(PACKAGES_ROOT)[1].split('/')[1]
    : '';

  return appName === 'observability' ? 'o11y' : camelCase(appName);
}
