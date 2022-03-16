/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fsp from 'fs/promises';
import Path from 'path';

import { ToolingLog, createFailError, diffStrings } from '@kbn/dev-utils';

export async function validateFile(log: ToolingLog, usage: string, path: string, expected: string) {
  const relPath = Path.relative(process.cwd(), path);

  let current;
  try {
    current = await Fsp.readFile(path, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      throw createFailError(`${relPath} is missing, please run "${usage}" and commit the result`);
    }

    throw error;
  }

  if (current !== expected) {
    log.error(`${relPath} is outdated:\n${diffStrings(expected, current)}`);
    throw createFailError(`${relPath} is outdated, please run "${usage}" and commit the result`);
  }

  log.success(`${relPath} is valid`);
}
