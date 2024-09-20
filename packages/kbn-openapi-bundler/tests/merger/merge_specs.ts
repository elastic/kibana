/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join } from 'path';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { OpenAPIV3 } from 'openapi-types';
import { merge, MergerConfig } from '../../src/openapi_merger';

const ROOT_PATH = join(__dirname, '..');

// Suppress merger logging via mocking the logger
jest.mock('../../src/logger');

export async function mergeSpecs(
  oasSpecs: Record<string, OpenAPIV3.Document>,
  options?: MergerConfig['options']
): Promise<Record<string, OpenAPIV3.Document>> {
  const randomStr = (Math.random() + 1).toString(36).substring(7);
  const folderToMergePath = join(ROOT_PATH, 'target', 'oas-test', randomStr);
  const resultFolderPath = join(ROOT_PATH, 'target', 'oas-test-merged-result', randomStr);
  const mergedFilePathTemplate = join(resultFolderPath, '{version}.yaml');

  dumpSpecs(folderToMergePath, oasSpecs);

  await mergeFolder(folderToMergePath, mergedFilePathTemplate, options);

  return readMergedSpecs(resultFolderPath);
}

function removeFolder(folderPath: string): void {
  if (existsSync(folderPath)) {
    for (const fileName of readdirSync(folderPath)) {
      unlinkSync(join(folderPath, fileName));
    }

    rmdirSync(folderPath);
  }
}

function dumpSpecs(folderPath: string, oasSpecs: Record<string, OpenAPIV3.Document>): void {
  removeFolder(folderPath);
  mkdirSync(folderPath, { recursive: true });

  for (const [fileName, oasSpec] of Object.entries(oasSpecs)) {
    writeFileSync(
      join(folderPath, `${fileName}.schema.yaml`),
      dump(oasSpec, { skipInvalid: true })
    );
  }
}

export function readMergedSpecs(folderPath: string): Record<string, OpenAPIV3.Document> {
  const mergedSpecs: Record<string, OpenAPIV3.Document> = {};

  for (const fileName of readdirSync(folderPath)) {
    const yaml = readFileSync(join(folderPath, fileName), { encoding: 'utf8' });

    mergedSpecs[fileName] = load(yaml);
  }

  return mergedSpecs;
}

export async function mergeFolder(
  folderToMergePath: string,
  mergedFilePathTemplate: string,
  options?: MergerConfig['options']
): Promise<void> {
  await merge({
    sourceGlobs: [join(folderToMergePath, '*.schema.yaml')],
    outputFilePath: mergedFilePathTemplate,
    options,
  });
}
