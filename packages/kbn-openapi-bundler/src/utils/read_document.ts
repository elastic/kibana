/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs/promises';
import { basename, extname } from 'path';
import chalk from 'chalk';
import { logger } from '../logger';
import { isPlainObjectType } from './is_plain_object_type';

export async function readDocument(documentPath: string): Promise<Record<string, unknown>> {
  logger.debug(`Reading ${chalk.bold(basename(documentPath))}`);

  const maybeDocument = await readFile(documentPath);

  if (!isPlainObjectType(maybeDocument)) {
    throw new Error(`File at ${chalk.bold(documentPath)} is not valid OpenAPI document`);
  }

  return maybeDocument;
}

async function readFile(filePath: string): Promise<unknown> {
  const extension = extname(filePath);

  switch (extension) {
    case '.yaml':
    case '.yml':
      return await readYamlFile(filePath);

    case '.json':
      return await readJsonFile(filePath);

    default:
      throw new Error(`${extension} files are not supported`);
  }
}

async function readYamlFile(filePath: string): Promise<Record<string, unknown>> {
  const fileContent = await fs.readFile(filePath, { encoding: 'utf8' });
  const maybeObject = load(fileContent);

  if (!isPlainObjectType(maybeObject)) {
    throw new Error(
      `Expected ${chalk.bold(filePath)} to contain an object but got ${typeof maybeObject}`
    );
  }

  return maybeObject;
}

async function readJsonFile(filePath: string): Promise<Record<string, unknown>> {
  const fileContent = await fs.readFile(filePath, { encoding: 'utf8' });

  try {
    const maybeObject = JSON.parse(fileContent);

    if (!isPlainObjectType(maybeObject)) {
      throw new Error(
        `Expected ${chalk.bold(filePath)} to contain an object but got ${typeof maybeObject}`
      );
    }

    return maybeObject;
  } catch {
    throw new Error(`Unable to parse ${chalk.bold(filePath)}`);
  }
}
