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

  it('bundles one file with a local reference', async () => {
    await bundleFolder('spec_with_local_ref');
    await expectBundleToMatchFile('spec_with_local_ref', 'expected.yaml');
  });

  it('bundles one file with an external reference', async () => {
    await bundleFolder('spec_with_external_ref');
    await expectBundleToMatchFile('spec_with_external_ref', 'expected.yaml');
  });

  it('bundles files with external references', async () => {
    await bundleFolder('two_specs_with_external_ref');
    await expectBundleToMatchFile('two_specs_with_external_ref', 'expected.yaml');
  });

  // Fails because `writeYamlDocument()` has `noRefs: true` setting
  // it('bundles recursive spec', async () => {
  //   await bundleFolder('recursive_spec');
  //   await expectBundleToMatchFile('recursive_spec', 'expected.yaml');
  // });

  it('bundles specs with recursive references', async () => {
    await bundleFolder('recursive_ref_specs');
    await expectBundleToMatchFile('recursive_ref_specs', 'expected.yaml');
  });

  it('bundles spec with a self-recursive reference', async () => {
    await bundleFolder('self_recursive_ref');
    await expectBundleToMatchFile('self_recursive_ref', 'expected.yaml');
  });

  it('bundles one endpoint with different versions', async () => {
    await bundleFolder('different_endpoint_versions');
    await expectBundleToMatchFile('different_endpoint_versions', 'expected.yaml');
  });

  it('bundles spec with different OpenAPI versions', async () => {
    await bundleFolder('different_openapi_versions');
    await expectBundleToMatchFile('different_openapi_versions', 'expected.yaml');
  });

  it('bundles conflicting but equal references', async () => {
    await bundleFolder('conflicting_but_equal_refs_in_different_specs');
    await expectBundleToMatchFile('conflicting_but_equal_refs_in_different_specs', 'expected.yaml');
  });

  it('fails to bundle conflicting references encountered in separate specs', async () => {
    await expectBundlingError(
      'conflicting_refs_in_different_specs',
      /\/components\/schemas\/ConflictTestSchema/
    );
  });

  describe('x-modify', () => {
    it('makes properties in an object node partial', async () => {
      await bundleFolder('modify_partial_node');
      await expectBundleToMatchFile('modify_partial_node', 'expected.yaml');
    });

    it('makes properties in a referenced object node partial', async () => {
      await bundleFolder('modify_partial_ref');
      await expectBundleToMatchFile('modify_partial_ref', 'expected.yaml');
    });

    it('makes properties in an object node required', async () => {
      await bundleFolder('modify_required_node');
      await expectBundleToMatchFile('modify_required_node', 'expected.yaml');
    });

    it('makes properties in a referenced object node required', async () => {
      await bundleFolder('modify_required_ref');
      await expectBundleToMatchFile('modify_required_ref', 'expected.yaml');
    });
  });

  describe('x-inline', () => {
    it('inlines a reference', async () => {
      await bundleFolder('inline_ref');
      await expectBundleToMatchFile('inline_ref', 'expected.yaml');
    });
  });

  describe('skip internal', () => {
    it('skips nodes with x-internal property', async () => {
      await bundleFolder('skip_internal');
      await expectBundleToMatchFile('skip_internal', 'expected.yaml');
    });

    it('skips endpoints starting with /internal', async () => {
      await bundleFolder('skip_internal_endpoint');
      await expectBundleToMatchFile('skip_internal_endpoint', 'expected.yaml');
    });
  });
});

async function bundleFolder(folderName: string): Promise<void> {
  await expect(
    bundle({
      rootDir: join(rootPath, folderName),
      sourceGlob: '*.schema.yaml',
      outputFilePath: join('..', basename(targetAbsoluteFilePath)),
    })
  ).resolves.toBeUndefined();
}

async function expectBundlingError(
  folderName: string,
  error: string | RegExp | jest.Constructable | Error | undefined
): Promise<void> {
  return await expect(
    bundle({
      rootDir: join(rootPath, folderName),
      sourceGlob: '*.schema.yaml',
      outputFilePath: join('..', basename(targetAbsoluteFilePath)),
    })
  ).rejects.toThrowError(error);
}

async function expectBundleToMatchFile(
  folderName: string,
  expectedFileName: string
): Promise<void> {
  expect(existsSync(targetAbsoluteFilePath)).toBeTruthy();

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
