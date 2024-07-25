/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs/promises';
import { load } from 'js-yaml';
import { basename, extname } from 'path';
import chalk from 'chalk';
import { logger } from '../logger';

export async function readDocument(documentPath: string): Promise<Record<string, unknown>> {
  const extension = extname(documentPath);

  logger.debug(`Reading ${chalk.bold(basename(documentPath))}`);

  switch (extension) {
    case '.yaml':
    case '.yml':
      return await readYamlDocument(documentPath);

    case '.json':
      return await readJsonDocument(documentPath);

    default:
      throw new Error(`${extension} files are not supported`);
  }
}

async function readYamlDocument(filePath: string): Promise<Record<string, unknown>> {
  // Typing load's result to Record<string, unknown> is optimistic as we can't be sure
  // there is object inside a yaml file. We don't have this validation layer so far
  // but using JSON Schemas here should mitigate this problem.
  return load(await fs.readFile(filePath, { encoding: 'utf8' }));
}

export async function readJsonDocument(filePath: string): Promise<Record<string, unknown>> {
  // Typing load's result to Record<string, unknown> is optimistic as we can't be sure
  // there is object inside a yaml file. We don't have this validation layer so far
  // but using JSON Schemas here should mitigate this problem.
  return await JSON.parse(await fs.readFile(filePath, { encoding: 'utf8' }));
}
