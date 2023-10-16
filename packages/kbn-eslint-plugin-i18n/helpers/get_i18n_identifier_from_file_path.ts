/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs';
import { join, parse, resolve } from 'path';
import { findKey } from 'lodash';

export function getI18nIdentifierFromFilePath(fileName: string, cwd: string) {
  const { dir } = parse(fileName);
  const relativePathToFile = dir.replace(cwd, '');

  const relativePathArray = relativePathToFile.split('/');

  const path = `${relativePathArray[2]}/${relativePathArray[3]}`;

  const xpackRC = resolve(join(__dirname, '../../../'), 'x-pack/.i18nrc.json');

  const i18nrcFile = fs.readFileSync(xpackRC, 'utf8');
  const i18nrc = JSON.parse(i18nrcFile);

  return i18nrc && i18nrc.paths
    ? findKey(i18nrc.paths, (v) => v === path) ?? 'app_not_found_in_i18nrc'
    : 'app_not_found_in_i18nrc';
}
