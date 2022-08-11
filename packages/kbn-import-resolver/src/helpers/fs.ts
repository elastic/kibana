/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';

export function safeStat(path: string) {
  try {
    return Fs.statSync(path);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return undefined;
    }

    throw error;
  }
}

export function readFileSync(path: string) {
  return Fs.readFileSync(path, 'utf8');
}
