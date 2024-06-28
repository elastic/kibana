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

  // We need to match the path of the file that is being worked in with the path
  // that is noted in the values inside the i18nrc.json object.
  // These values differ depending on which i18nrc.json object you look at (there are multiple)
  // so we need to account for both notations.
  const relativePathArray = relativePathToFile.includes('src')
    ? relativePathToFile.split('/').slice(1)
    : relativePathToFile.split('/').slice(2);

  const pluginNameIndex = relativePathArray.findIndex(
    (el) => el === 'public' || el === 'server' || el === 'common'
  );

  const path = relativePathArray.slice(0, pluginNameIndex).join('/').replace('x-pack/', '');

  const xpackRC = resolve(join(__dirname, '../../../'), 'x-pack/.i18nrc.json');
  const rootRC = resolve(join(__dirname, '../../../'), '.i18nrc.json');

  const xpackI18nrcFile = fs.readFileSync(xpackRC, 'utf8');
  const xpackI18nrc = JSON.parse(xpackI18nrcFile);

  const rootI18nrcFile = fs.readFileSync(rootRC, 'utf8');
  const rootI18nrc = JSON.parse(rootI18nrcFile);

  const allPaths = { ...xpackI18nrc.paths, ...rootI18nrc.paths };

  if (Object.keys(allPaths).length === 0) return 'could_not_find_i18nrc';

  return (
    findKey(allPaths, (value) =>
      Array.isArray(value)
        ? value.find((el) => el === path)
        : typeof value === 'string' && value === path
    ) ?? 'app_not_found_in_i18nrc'
  );
}
