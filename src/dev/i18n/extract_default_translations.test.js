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

import {
  extractDefaultTranslations,
  validateMessageNamespace,
} from './extract_default_translations';

const fixturesPath = path.resolve(__dirname, '__fixtures__', 'extract_default_translations');
const pluginsPaths = [
  path.join(fixturesPath, 'test_plugin_1'),
  path.join(fixturesPath, 'test_plugin_2'),
  path.join(fixturesPath, 'test_plugin_3'),
];

jest.mock('../../../.i18nrc.json', () => ({
  paths: {
    plugin_1: 'src/dev/i18n/__fixtures__/extract_default_translations/test_plugin_1',
    plugin_2: 'src/dev/i18n/__fixtures__/extract_default_translations/test_plugin_2',
    plugin_3: 'src/dev/i18n/__fixtures__/extract_default_translations/test_plugin_3',
  },
  exclude: [],
}));

const utils = require('./utils');
utils.writeFileAsync = jest.fn();

describe('dev/i18n/extract_default_translations', () => {
  test('extracts messages to en.json', async () => {
    const [pluginPath] = pluginsPaths;

    utils.writeFileAsync.mockClear();
    await extractDefaultTranslations({
      paths: [pluginPath],
      output: pluginPath,
    });

    const [[, json]] = utils.writeFileAsync.mock.calls;

    expect(json.toString()).toMatchSnapshot();
  });

  test('injects default formats into en.json', async () => {
    const [, pluginPath] = pluginsPaths;

    utils.writeFileAsync.mockClear();
    await extractDefaultTranslations({
      paths: [pluginPath],
      output: pluginPath,
    });

    const [[, json]] = utils.writeFileAsync.mock.calls;

    expect(json.toString()).toMatchSnapshot();
  });

  test('throws on id collision', async () => {
    const [, , pluginPath] = pluginsPaths;
    await expect(
      extractDefaultTranslations({ paths: [pluginPath], output: pluginPath })
    ).rejects.toThrowErrorMatchingSnapshot();
  });

  test('validates message namespace', () => {
    const id = 'plugin_2.message-id';
    const filePath = path.resolve(
      __dirname,
      '__fixtures__/extract_default_translations/test_plugin_2/test_file.html'
    );
    expect(() => validateMessageNamespace(id, filePath)).not.toThrow();
  });

  test('throws on wrong message namespace', () => {
    const id = 'wrong_plugin_namespace.message-id';
    const filePath = path.resolve(
      __dirname,
      '__fixtures__/extract_default_translations/test_plugin_2/test_file.html'
    );
    expect(() => validateMessageNamespace(id, filePath)).toThrowErrorMatchingSnapshot();
  });
});
