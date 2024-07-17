/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { join } from 'path';
import { bundleFolder, readBundledSpecs } from './bundle_specs';

const ROOT_PATH = join(__dirname, '..', '..');

describe('OpenAPI Bundler - specs with multiple modifications', () => {
  it('bundles specs performing multiple modifications without interference', async () => {
    const folderToBundlePath = join(__dirname, 'complex_specs');
    const outputFolderPath = join(ROOT_PATH, 'target', 'complex_specs_test');
    const bundledFilePathTemplate = join(outputFolderPath, 'oas-test-bundle-{version}.yaml');

    await bundleFolder(folderToBundlePath, bundledFilePathTemplate, {
      includeLabels: ['include'],
    });

    const [bundledSpec] = Object.values(readBundledSpecs(outputFolderPath));

    const expected = load(
      readFileSync(join(folderToBundlePath, 'expected.yaml'), { encoding: 'utf8' })
    );

    expect(bundledSpec).toEqual(expected);
  });
});
