/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';

export function readFile(filePath: string) {
  return readFileSync(filePath, 'utf8');
}

export function readJsonWithComments(filePath: string) {
  let fileCleaned;
  try {
    const file = readFile(filePath);
    fileCleaned = file
      .split('\n')
      .filter((l) => !l.match(/^\s*\/\//))
      .map((l) => l.replace(/\/\/.*$/g, ''))
      .join('')
      .replace(/(\s)*/g, '')
      .replace(/,([}\]])/g, '$1');
    return JSON.parse(fileCleaned);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`Failed to read ${filePath}: `, fileCleaned);
    throw e;
  }
}
