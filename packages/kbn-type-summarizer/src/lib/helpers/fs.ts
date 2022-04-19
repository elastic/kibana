/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fsp from 'fs/promises';
import { toError, isSystemError } from './error';

export async function tryReadFile(
  path: string,
  encoding: 'utf-8' | 'utf8'
): Promise<string | undefined>;
export async function tryReadFile(path: string, encoding?: BufferEncoding) {
  try {
    return await Fsp.readFile(path, encoding);
  } catch (_) {
    const error = toError(_);
    if (isSystemError(error) && error.code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}
