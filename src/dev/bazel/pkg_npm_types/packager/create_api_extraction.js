/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

const { format, parseTsconfig } = require('@bazel/typescript');
const { Extractor, ExtractorConfig } = require('@microsoft/api-extractor');
const fs = require('fs');
const path = require('path');

function createApiExtraction(
  tsConfig,
  entryPoint,
  dtsBundleOut,
  apiReviewFolder,
  acceptApiUpdates = false
) {
  const [parsedConfig, errors] = parseTsconfig(tsConfig);
  if (errors && errors.length) {
    console.error(format('', errors));
    return 1;
  }
  const pkgJson = path.resolve(path.dirname(entryPoint), 'package.json');
  if (!fs.existsSync(pkgJson)) {
    fs.writeFileSync(
      pkgJson,
      JSON.stringify({
        name: 'GENERATED-BY-BAZEL',
        description: 'This is a dummy package.json as API Extractor always requires one.',
        types: './index.d.ts',
        private: true,
        license: 'SSPL-1.0 OR Elastic License 2.0',
        version: '1.0.0',
      })
    );
  }
  // API extractor doesn't always support the version of TypeScript used in the repo
  // example: at the moment it is not compatable with 3.2
  // to use the internal TypeScript we shall not create a program but rather pass a parsed tsConfig.
  const parsedTsConfig = parsedConfig.config;
  const extractorOptions = {
    localBuild: acceptApiUpdates,
  };
  const configObject = {
    compiler: {
      overrideTsconfig: parsedTsConfig,
    },
    projectFolder: path.resolve(path.dirname(tsConfig)),
    mainEntryPointFilePath: path.resolve(entryPoint),
    apiReport: {
      enabled: !!apiReviewFolder,
      // TODO(alan-agius4): remove this folder name when the below issue is solved upstream
      // See: https://github.com/microsoft/web-build-tools/issues/1470
      reportFileName: (apiReviewFolder && path.resolve(apiReviewFolder)) || 'invalid',
    },
    docModel: {
      enabled: false,
    },
    dtsRollup: {
      enabled: !!dtsBundleOut,
      untrimmedFilePath: dtsBundleOut && path.resolve(dtsBundleOut),
    },
    tsdocMetadata: {
      enabled: false,
    },
  };
  const options = {
    configObject,
    packageJson: undefined,
    packageJsonFullPath: pkgJson,
    configObjectFullPath: undefined,
  };
  const extractorConfig = ExtractorConfig.prepare(options);
  const { succeeded } = Extractor.invoke(extractorConfig, extractorOptions);
  // API extractor errors are emitted by it's logger.
  return succeeded ? 0 : 1;
}

module.exports.createApiExtraction = createApiExtraction;
