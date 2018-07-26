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

import path from 'path';

import { checkFile, checkLocaleFiles } from './check_locale_files';

const testsFixturesRoot = path.resolve(__dirname, '__fixtures__', 'check_locale_files');

const pluginsPaths = [
  path.join(testsFixturesRoot, 'test_plugin_1'),
  path.join(testsFixturesRoot, 'test_plugin_2'),
  path.join(testsFixturesRoot, 'test_plugin_3'),
  path.join(testsFixturesRoot, 'test_plugin_4'),
  path.join(testsFixturesRoot, 'test_plugin_5'),
];

describe('dev/i18n/check_locale_files', () => {
  describe('checkFile', () => {
    it('returns namespace of a valid JSON file', async () => {
      const localePath1 = path.join(pluginsPaths[0], 'translations', 'valid.json');
      const localePath2 = path.join(pluginsPaths[1], 'translations', 'valid.json');

      expect(await checkFile(localePath1)).toBe('test_plugin_1');
      expect(await checkFile(localePath2)).toBe('test_plugin_2');
    });

    it('throws an error for unused id and missing id', async () => {
      const localeWithMissingMessage = path.join(pluginsPaths[2], 'translations', 'missing.json');
      const localeWithUnusedMessage = path.join(pluginsPaths[2], 'translations', 'unused.json');
      await expect(checkFile(localeWithMissingMessage)).rejects.toThrowErrorMatchingSnapshot();
      await expect(checkFile(localeWithUnusedMessage)).rejects.toThrowErrorMatchingSnapshot();
    });
  });

  describe('checkLocaleFiles', () => {
    it('validates locale files in multiple plugins', async () => {
      expect(await checkLocaleFiles([pluginsPaths[0], pluginsPaths[1]])).toBe(undefined);
    });

    it('throws an error for namespaces collision', async () => {
      await expect(
        checkLocaleFiles([pluginsPaths[3], pluginsPaths[4]])
      ).rejects.toThrowErrorMatchingSnapshot();
    });
  });
});
