/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { getCacheKey, install, process } from 'ts-jest';
import { JestConfig, TransformOptions } from 'ts-jest/dist/jest-types';

import { getTsProjectForAbsolutePath } from '../typescript';

const DEFAULT_TS_CONFIG_PATH = require.resolve('../../../tsconfig.json');
const DEFAULT_BROWSER_TS_CONFIG_PATH = require.resolve('../../../tsconfig.browser.json');

function extendJestConfigJSON(jestConfigJSON: string, filePath: string) {
  const jestConfig = JSON.parse(jestConfigJSON) as JestConfig;
  return JSON.stringify(extendJestConfig(jestConfig, filePath));
}

function extendJestConfig(jestConfig: JestConfig, filePath: string) {
  let tsConfigFile = getTsProjectForAbsolutePath(filePath).tsConfigPath;

  // swap ts config file for jest tests
  if (tsConfigFile === DEFAULT_BROWSER_TS_CONFIG_PATH) {
    tsConfigFile = DEFAULT_TS_CONFIG_PATH;
  }

  return {
    ...jestConfig,
    globals: {
      ...(jestConfig.globals || {}),
      'ts-jest': {
        skipBabel: true,
        tsConfigFile,
      },
    },
  };
}

module.exports = {
  process(
    src: string,
    filePath: string,
    jestConfig: JestConfig,
    transformOptions: TransformOptions
  ) {
    const extendedConfig = extendJestConfig(jestConfig, filePath);
    return process(src, filePath, extendedConfig, transformOptions);
  },

  getCacheKey(
    src: string,
    filePath: string,
    jestConfigJSON: string,
    transformOptions: TransformOptions
  ) {
    const extendedConfigJSON = extendJestConfigJSON(jestConfigJSON, filePath);
    return getCacheKey(src, filePath, extendedConfigJSON, transformOptions);
  },

  install,
};
