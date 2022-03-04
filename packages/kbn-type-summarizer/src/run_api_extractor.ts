/* eslint-disable @kbn/eslint/require-license-header */

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import Fsp from 'fs/promises';
import Path from 'path';

import { Extractor, ExtractorConfig } from '@microsoft/api-extractor';

import { readTsConfigFile } from './lib/tsconfig_file';
import { CliError } from './lib/cli_error';

export async function runApiExtractor(
  tsconfigPath: string,
  entryPath: string,
  dtsBundleOutDir: string
) {
  const pkgJson = Path.resolve(Path.dirname(entryPath), 'package.json');
  try {
    await Fsp.writeFile(
      pkgJson,
      JSON.stringify({
        name: 'GENERATED-BY-BAZEL',
        description: 'This is a dummy package.json as API Extractor always requires one.',
        types: './index.d.ts',
        private: true,
        license: 'SSPL-1.0 OR Elastic License 2.0',
        version: '1.0.0',
      }),
      {
        flag: 'wx',
      }
    );
  } catch (error) {
    if (!error.code || error.code !== 'EEXIST') {
      throw error;
    }
  }

  // API extractor doesn't always support the version of TypeScript used in the repo
  // example: at the moment it is not compatable with 3.2
  // to use the internal TypeScript we shall not create a program but rather pass a parsed tsConfig.
  const extractorOptions = {
    localBuild: false,
  };

  const extractorConfig = ExtractorConfig.prepare({
    configObject: {
      compiler: {
        overrideTsconfig: readTsConfigFile(tsconfigPath),
      },
      projectFolder: Path.dirname(tsconfigPath),
      mainEntryPointFilePath: entryPath,
      apiReport: {
        enabled: false,
        // TODO(alan-agius4): remove this folder name when the below issue is solved upstream
        // See: https://github.com/microsoft/web-build-tools/issues/1470
        reportFileName: 'invalid',
      },
      docModel: {
        enabled: false,
      },
      dtsRollup: {
        enabled: !!dtsBundleOutDir,
        untrimmedFilePath: dtsBundleOutDir,
      },
      tsdocMetadata: {
        enabled: false,
      },
    },
    packageJson: undefined,
    packageJsonFullPath: pkgJson,
    configObjectFullPath: undefined,
  });
  const { succeeded } = Extractor.invoke(extractorConfig, extractorOptions);

  if (!succeeded) {
    throw new CliError('api-extractor failed');
  }
}
