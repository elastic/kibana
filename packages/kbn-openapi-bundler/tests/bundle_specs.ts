/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
import { dump, load } from 'js-yaml';
import { OpenAPIV3 } from 'openapi-types';
import { bundle, BundlerConfig } from '../src/openapi_bundler';

const ROOT_PATH = join(__dirname, '..');

// Suppress bundler logging via mocking the logger
jest.mock('../src/logger');

export async function bundleSpecs(
  oasSpecs: Record<string, OpenAPIV3.Document>,
  options?: BundlerConfig['options']
): Promise<Record<string, OpenAPIV3.Document>> {
  const randomStr = (Math.random() + 1).toString(36).substring(7);
  const folderToBundlePath = join(ROOT_PATH, 'target', 'oas-test', randomStr);
  const resultFolderPath = join(ROOT_PATH, 'target', 'oas-test-bundled-result', randomStr);
  const bundledFilePathTemplate = join(resultFolderPath, '{version}.yaml');

  dumpSpecs(folderToBundlePath, oasSpecs);

  await bundleFolder(folderToBundlePath, bundledFilePathTemplate, options);

  return readBundledSpecs(resultFolderPath);
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
    writeFileSync(join(folderPath, `${fileName}.schema.yaml`), dump(oasSpec));
  }
}

export function readBundledSpecs(folderPath: string): Record<string, OpenAPIV3.Document> {
  const bundledSpecs: Record<string, OpenAPIV3.Document> = {};

  for (const fileName of readdirSync(folderPath)) {
    const yaml = readFileSync(join(folderPath, fileName), { encoding: 'utf8' });

    bundledSpecs[fileName] = load(yaml);
  }

  return bundledSpecs;
}

export async function bundleFolder(
  folderToBundlePath: string,
  bundledFilePathTemplate: string,
  options?: BundlerConfig['options']
): Promise<void> {
  await bundle({
    sourceGlob: join(folderToBundlePath, '*.schema.yaml'),
    outputFilePath: bundledFilePathTemplate,
    options,
  });
}
