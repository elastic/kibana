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

import {
  getKibanaTranslationFiles,
  PluginsTranslationConfig,
} from './get_kibana_translation_files';
import { getTranslationPaths as mockGetTranslationPaths } from './get_translation_paths';

jest.mock('./get_translation_paths', () => ({
  getTranslationPaths: jest.fn().mockResolvedValue([]),
}));
jest.mock('../utils', () => ({
  fromRoot: jest.fn().mockImplementation((path: string) => path),
}));

const createPluginConfig = (
  pluginSearchPaths: string[] = [],
  additionalPluginPaths: string[] = []
): PluginsTranslationConfig => ({
  pluginSearchPaths,
  additionalPluginPaths,
});

const locale = 'en';

describe('getKibanaTranslationPaths', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls getTranslationPaths against kibana root and kibana-extra', async () => {
    await getKibanaTranslationFiles(locale, createPluginConfig());

    expect(mockGetTranslationPaths).toHaveBeenCalledTimes(2);

    expect(mockGetTranslationPaths).toHaveBeenCalledWith({
      cwd: '.',
      nested: true,
    });

    expect(mockGetTranslationPaths).toHaveBeenCalledWith({
      cwd: '../kibana-extra',
      nested: true,
    });
  });

  it('calls getTranslationPaths for each config returned in plugin.paths and plugins.scanDirs', async () => {
    const searchPaths = ['searchPath-A', 'searchPath-B'];
    const additionalPluginPaths = ['additionalPath-A', 'additionalPath-B'];

    const pluginConfig = createPluginConfig(searchPaths, additionalPluginPaths);

    await getKibanaTranslationFiles(locale, pluginConfig);

    searchPaths.forEach((searchPath) => {
      expect(mockGetTranslationPaths).toHaveBeenCalledWith({
        cwd: searchPath,
        nested: true,
      });
    });

    additionalPluginPaths.forEach((additionalPluginPath) => {
      expect(mockGetTranslationPaths).toHaveBeenCalledWith({
        cwd: additionalPluginPath,
        nested: false,
      });
    });
  });

  // TODO: filter per locale logic test.
});
