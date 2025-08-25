/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';
import { readFileSync } from 'fs';
// @ts-expect-error test utils is defined and exists, see https://github.com/facebook/jscodeshift#applytransform
import { applyTransform } from 'jscodeshift/dist/testUtils';

import pathFileTransform from './transform_path_file';

// read contents of the path file our transform is built to update
const pathFileContents = readFileSync(
  resolve(process.cwd(), '../src/platform/packages/private/kbn-screenshotting-server/src/paths.ts'),
  'utf8'
);

/**
 * @type {import('./transform_path_file').transformOptions}
 */
const transformOptions = {
  chromiumVersion: '130.6943.126',
  updateConfig: {
    mac_x64: {
      archiveChecksum: '2e64a158419165ceee5db0b57703777bf21470f2d9656bbf100f54ebe059f695',
      binaryChecksum: '53dbb5e3d4327c980d7bb6dbcb6bd6f73b1de573925a2d4dab010d6cafcc3bbc',
    },
    mac_arm64: {
      archiveChecksum: '51645431ecc1d843d4fdc34f3817ca2a4ac7c3b4450eb9f3117f806ebaa78487',
      binaryChecksum: '35f42c93856df90bd01bc809e8a32bffb25a48c83d7cc2feb9af6e2376f7fc65',
    },
    win64: {
      archiveChecksum: '4fd9484cf67790b5bbff39be62d5835f6848a326a68b4be1b83dc22a4336efa1',
      binaryChecksum: '46054cfc2be47f7822008e29674baefd82912cdae107fbe07027cbe84622c0b9',
    },
    linux_x64: {
      archiveFilename: 'chromium-cffa127-locales-linux_x64.zip',
      archiveChecksum: '082d3bcabe0a04c4ec7f90d8e425f9c63147015964aa0d3b59a1cccd66571939',
      binaryChecksum: 'a22ecc374131998d7ed05b2f433a1a8a819e3ae3b9c4dfa92311cf11ac9e34e1',
    },
    linux_arm64: {
      archiveFilename: 'chromium-cffa127-locales-linux_arm64.zip',
      archiveChecksum: '571437335b3b867207650390ca8827ea71a58a842f7bb22bbb497a1266324431',
      binaryChecksum: '68dafc4ae03cc4c2812e94f61f62db72a7dcde95754d817594bf25e3862647be',
    },
  },
};

const runnerOptions = {
  parser: 'tsx',
  extensions: 'ts',
};

describe('transform_path_file', () => {
  it('throws an error if options are missing', () => {
    expect(() => {
      applyTransform(pathFileTransform, {}, pathFileContents, runnerOptions);
    }).toThrow('Expected options to be defined');
  });

  it('throws an error if chromiumVersion is missing', () => {
    expect(() => {
      applyTransform(
        pathFileTransform,
        {
          updateConfig: transformOptions.updateConfig,
        },
        { source: pathFileContents },
        runnerOptions
      );
    }).toThrow('Expected version to be defined');
  });

  it('throws an error if updateConfig is missing', () => {
    expect(() => {
      applyTransform(
        pathFileTransform,
        {
          chromiumVersion: transformOptions.chromiumVersion,
        },
        { source: pathFileContents },
        runnerOptions
      );
    }).toThrow('Expected updateConfig to be defined');
  });

  // This test fails because a change was made to the `kbn-screenshotting-server/src/paths.ts` file that is not reflected
  // in the transform being tested.
  // See entry.js for an example on how you might verify that the script creates the right modification in the paths file,
  // when you've made changes that match the expected output update the test snapshot to match the new output
  it('transform output matches our expectation', () => {
    const output = applyTransform(
      pathFileTransform,
      transformOptions,
      { source: pathFileContents },
      runnerOptions
    );
    expect(output).toMatchSnapshot('updated_paths_file');
  });
});
