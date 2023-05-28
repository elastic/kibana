/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';

export function toArray(val?: string | string[]) {
  return val ? (typeof val === 'string' ? [val] : val) : [];
}

export function toPosix(file: string, sep: string = path.sep) {
  return file.split(sep).join(path.posix.sep);
}

export const getRandomPort = () => {
  const min = 1024;
  const max = 65535;
  return Math.floor(Math.random() * (max - min + 1)) + min;
};
