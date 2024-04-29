/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { bundle } from './openapi_bundler';
import { readYamlDocument } from './utils/read_yaml_document';

const ROOT_PATH = join(__dirname, '__test__');
const BUNDLED_FILE_PATH_TEMPLATE = join(__dirname, 'target', 'bundled-{version}.yaml');
const DEFAULT_BUNDLED_FILE_PATH = BUNDLED_FILE_PATH_TEMPLATE.replace('{version}', '2023-10-31');

describe('OpenAPI Bundler', () => {
  it('bundles two simple specs', async () => {
    await bundleFolder('two_simple_specs');
    await expectBundleToMatchFile(
      DEFAULT_BUNDLED_FILE_PATH,
      join('two_simple_specs', 'expected.yaml')
    );
  });

  it('bundles one endpoint with different versions', async () => {
    await bundleFolder('different_endpoint_versions');
    await expectBundleToMatchFile(
      BUNDLED_FILE_PATH_TEMPLATE.replace('{version}', '2023-10-31'),
      join('different_endpoint_versions', 'expected_2023_10_31.yaml')
    );
    await expectBundleToMatchFile(
      BUNDLED_FILE_PATH_TEMPLATE.replace('{version}', '2023-11-11'),
      join('different_endpoint_versions', 'expected_2023_11_11.yaml')
    );
  });

  it('bundles spec with different OpenAPI versions', async () => {
    await bundleFolder('different_openapi_versions');
    await expectBundleToMatchFile(
      DEFAULT_BUNDLED_FILE_PATH,
      join('different_openapi_versions', 'expected.yaml')
    );
  });

  describe('bundle references', () => {
    it('bundles files with external references', async () => {
      const folder = join('bundle_refs', 'two_specs_with_external_ref');

      await bundleFolder(folder);
      await expectBundleToMatchFile(DEFAULT_BUNDLED_FILE_PATH, join(folder, 'expected.yaml'));
    });

    it('bundles one file with a local reference', async () => {
      const folder = join('bundle_refs', 'spec_with_local_ref');

      await bundleFolder(folder);
      await expectBundleToMatchFile(DEFAULT_BUNDLED_FILE_PATH, join(folder, 'expected.yaml'));
    });

    it('bundles one file with an external reference', async () => {
      const folder = join('bundle_refs', 'spec_with_external_ref');

      await bundleFolder(folder);
      await expectBundleToMatchFile(DEFAULT_BUNDLED_FILE_PATH, join(folder, 'expected.yaml'));
    });

    it('bundles conflicting but equal references', async () => {
      const folder = join('bundle_refs', 'conflicting_but_equal_refs_in_different_specs');

      await bundleFolder(folder);
      await expectBundleToMatchFile(DEFAULT_BUNDLED_FILE_PATH, join(folder, 'expected.yaml'));
    });

    it('fails to bundle external conflicting references encountered in on spec file', async () => {
      const folder = join('bundle_refs', 'conflicting_refs');

      await expectBundlingError(folder, /\/components\/schemas\/ConflictTestSchema/);
    });

    it('fails to bundle conflicting references encountered in separate specs', async () => {
      const folder = join('bundle_refs', 'conflicting_refs_in_different_specs');

      await expectBundlingError(folder, /\/components\/schemas\/ConflictTestSchema/);
    });
  });

  describe('circular references', () => {
    // Fails because `writeYamlDocument()` has `noRefs: true` setting
    // it('bundles recursive spec', async () => {
    //   const folder = join('circular', 'recursive_spec');

    //   await bundleFolder(folder);
    //   await expectBundleToMatchFile(DEFAULT_BUNDLED_FILE_PATH, join(folder, 'expected.yaml'));
    // });

    it('bundles specs with recursive references', async () => {
      const folder = join('circular', 'circular_ref_specs');

      await bundleFolder(folder);
      await expectBundleToMatchFile(DEFAULT_BUNDLED_FILE_PATH, join(folder, 'expected.yaml'));
    });

    it('bundles spec with a self-recursive reference', async () => {
      const folder = join('circular', 'self_recursive_ref');

      await bundleFolder(folder);
      await expectBundleToMatchFile(DEFAULT_BUNDLED_FILE_PATH, join(folder, 'expected.yaml'));
    });
  });

  describe('x-modify', () => {
    it('makes properties in an object node partial', async () => {
      const folder = join('x_modify', 'modify_partial_node');

      await bundleFolder(folder);
      await expectBundleToMatchFile(DEFAULT_BUNDLED_FILE_PATH, join(folder, 'expected.yaml'));
    });

    it('makes properties in a referenced object node partial', async () => {
      const folder = join('x_modify', 'modify_partial_ref');

      await bundleFolder(folder);
      await expectBundleToMatchFile(DEFAULT_BUNDLED_FILE_PATH, join(folder, 'expected.yaml'));
    });

    it('makes properties in an object node required', async () => {
      const folder = join('x_modify', 'modify_required_node');

      await bundleFolder(folder);
      await expectBundleToMatchFile(DEFAULT_BUNDLED_FILE_PATH, join(folder, 'expected.yaml'));
    });

    it('makes properties in a referenced object node required', async () => {
      const folder = join('x_modify', 'modify_required_ref');

      await bundleFolder(folder);
      await expectBundleToMatchFile(DEFAULT_BUNDLED_FILE_PATH, join(folder, 'expected.yaml'));
    });
  });

  describe('inline references', () => {
    it('inlines local references', async () => {
      const folder = join('inline_ref', 'inline_local_ref');

      await bundleFolder(folder);
      await expectBundleToMatchFile(DEFAULT_BUNDLED_FILE_PATH, join(folder, 'expected.yaml'));
    });

    it('inlines external references', async () => {
      const folder = join('inline_ref', 'inline_external_ref');

      await bundleFolder(folder);
      await expectBundleToMatchFile(DEFAULT_BUNDLED_FILE_PATH, join(folder, 'expected.yaml'));
    });
  });

  describe('skip internal', () => {
    it('skips nodes with x-internal property', async () => {
      const folder = join('skip', 'skip_internal');

      await bundleFolder(folder);
      await expectBundleToMatchFile(DEFAULT_BUNDLED_FILE_PATH, join(folder, 'expected.yaml'));
    });

    it('skips endpoints starting with /internal', async () => {
      const folder = join('skip', 'skip_internal_endpoint');

      await bundleFolder(folder);
      await expectBundleToMatchFile(DEFAULT_BUNDLED_FILE_PATH, join(folder, 'expected.yaml'));
    });
  });

  describe('remove props', () => {
    it('removes "x-codegen-enabled" property', async () => {
      await bundleFolder('remove_props');
      await expectBundleToMatchFile(
        DEFAULT_BUNDLED_FILE_PATH,
        join('remove_props', 'expected.yaml')
      );
    });
  });

  describe('reduce allOf items', () => {
    it('flatten folded allOfs', async () => {
      const folder = join('reduce_all_of', 'flatten_folded_all_of_items');

      await bundleFolder(folder);
      await expectBundleToMatchFile(DEFAULT_BUNDLED_FILE_PATH, join(folder, 'expected.yaml'));
    });

    it('unfolds single allOf item', async () => {
      const folder = join('reduce_all_of', 'unfold_single_all_of_item');

      await bundleFolder(folder);
      await expectBundleToMatchFile(DEFAULT_BUNDLED_FILE_PATH, join(folder, 'expected.yaml'));
    });

    it('merges non conflicting allOf object schema items', async () => {
      const folder = join('reduce_all_of', 'merge_non_conflicting_all_of_items');

      await bundleFolder(folder);
      await expectBundleToMatchFile(DEFAULT_BUNDLED_FILE_PATH, join(folder, 'expected.yaml'));
    });

    it('DOES NOT merge conflicting incompatible allOf object schema items', async () => {
      const folder = join('reduce_all_of', 'do_not_merge_conflicting_all_of_items');

      await bundleFolder(folder);
      await expectBundleToMatchFile(DEFAULT_BUNDLED_FILE_PATH, join(folder, 'expected.yaml'));
    });

    it('merges allOf object schema items with inlined references', async () => {
      const folder = join('reduce_all_of', 'merge_all_of_items_with_inlined_refs');

      await bundleFolder(folder);
      await expectBundleToMatchFile(DEFAULT_BUNDLED_FILE_PATH, join(folder, 'expected.yaml'));
    });

    it('merges allOf object schema items inlined in different document branches with extra field', async () => {
      const folder = join(
        'reduce_all_of',
        'merge_all_of_items_with_inlined_refs_in_different_document_branches'
      );

      await bundleFolder(folder);
      await expectBundleToMatchFile(DEFAULT_BUNDLED_FILE_PATH, join(folder, 'expected.yaml'));
    });
  });
});

async function bundleFolder(folderName: string): Promise<void> {
  await expect(
    bundle({
      rootDir: join(ROOT_PATH, folderName),
      sourceGlob: '*.schema.yaml',
      outputFilePath: BUNDLED_FILE_PATH_TEMPLATE,
    })
  ).resolves.toBeUndefined();
}

async function expectBundlingError(
  folderName: string,
  error: string | RegExp | jest.Constructable | Error | undefined
): Promise<void> {
  return await expect(
    bundle({
      rootDir: join(ROOT_PATH, folderName),
      sourceGlob: '*.schema.yaml',
      outputFilePath: BUNDLED_FILE_PATH_TEMPLATE,
    })
  ).rejects.toThrowError(error);
}

async function expectBundleToMatchFile(
  bundledFilePath: string,
  relativeFilePathToMatch: string
): Promise<void> {
  expect(existsSync(bundledFilePath)).toBeTruthy();

  const bundledSpec = await readYamlDocument(bundledFilePath);
  const expectedFilePath = join(ROOT_PATH, relativeFilePathToMatch);
  const expectedSpec = await readYamlDocument(expectedFilePath);

  expect(bundledSpec).toEqual(expectedSpec);
}
