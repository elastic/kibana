/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { existsSync, rmSync } from 'fs';
import { basename, join } from 'path';
import { bundle } from './openapi_bundler';
import { readYamlDocument } from './utils/read_yaml_document';

const rootPath = join(__dirname, '__test__');
const targetAbsoluteFilePath = join(rootPath, 'bundled.yaml');

describe('OpenAPI Bundler', () => {
  afterEach(() => {
    removeTargetFile();
  });

  it('bundles two simple specs', async () => {
    await bundleFolder('two_simple_specs');
    await expectBundleToMatchFile('two_simple_specs', 'expected.yaml');
  });
});

async function bundleFolder(folderName: string): Promise<void> {
  await bundle({
    rootDir: join(rootPath, folderName),
    sourceGlob: '*.schema.yaml',
    outputFilePath: join('..', basename(targetAbsoluteFilePath)),
  });
}

async function expectBundleToMatchFile(
  folderName: string,
  expectedFileName: string
): Promise<void> {
  const bundledSpec = await readYamlDocument(targetAbsoluteFilePath);
  const expectedAbsoluteFilePath = join(rootPath, folderName, expectedFileName);
  const expectedSpec = await readYamlDocument(expectedAbsoluteFilePath);

  expect(bundledSpec).toEqual(expectedSpec);
}

function removeTargetFile(): void {
  if (existsSync(targetAbsoluteFilePath)) {
    rmSync(targetAbsoluteFilePath, { force: true });
  }
}
