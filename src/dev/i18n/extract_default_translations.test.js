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
  extractMessagesFromPathToMap,
  validateMessageNamespace,
} from './extract_default_translations';
import { ErrorReporter } from './utils';

const fixturesPath = path.resolve(__dirname, '__fixtures__', 'extract_default_translations');
const pluginsPaths = [
  path.join(fixturesPath, 'test_plugin_1'),
  path.join(fixturesPath, 'test_plugin_2'),
  path.join(fixturesPath, 'test_plugin_3'),
  path.join(fixturesPath, 'test_plugin_3_additional_path'),
];

const config = {
  paths: {
    plugin_1: ['src/dev/i18n/__fixtures__/extract_default_translations/test_plugin_1'],
    plugin_2: ['src/dev/i18n/__fixtures__/extract_default_translations/test_plugin_2'],
    plugin_3: [
      'src/dev/i18n/__fixtures__/extract_default_translations/test_plugin_3',
      'src/dev/i18n/__fixtures__/extract_default_translations/test_plugin_3_additional_path',
    ],
  },
  exclude: [],
};

describe('dev/i18n/extract_default_translations', () => {
  test('extracts messages from path to map', async () => {
    const [pluginPath] = pluginsPaths;
    const resultMap = new Map();

    await extractMessagesFromPathToMap(pluginPath, resultMap, config, new ErrorReporter());
    expect([...resultMap].sort()).toMatchSnapshot();
  });

  test('throws on id collision', async () => {
    const [, , pluginPath] = pluginsPaths;
    const reporter = new ErrorReporter();

    await expect(
      extractMessagesFromPathToMap(pluginPath, new Map(), config, reporter)
    ).resolves.not.toThrow();
    expect(reporter.errors).toMatchSnapshot();
  });

  test('validates message namespace', () => {
    const id = 'plugin_2.message-id';
    const filePath = path.resolve(
      __dirname,
      '__fixtures__/extract_default_translations/test_plugin_2/test_file.html'
    );
    expect(() => validateMessageNamespace(id, filePath, config.paths)).not.toThrow();
  });

  test('validates message namespace with multiple paths', () => {
    const id = 'plugin_3.message-id';
    const filePath1 = path.resolve(
      __dirname,
      '__fixtures__/extract_default_translations/test_plugin_3/test_file.html'
    );
    const filePath2 = path.resolve(
      __dirname,
      '__fixtures__/extract_default_translations/test_plugin_3_additional_path/test_file.html'
    );
    expect(() => validateMessageNamespace(id, filePath1, config.paths)).not.toThrow();
    expect(() => validateMessageNamespace(id, filePath2, config.paths)).not.toThrow();
  });

  test('throws on wrong message namespace', () => {
    const report = jest.fn();
    const id = 'wrong_plugin_namespace.message-id';
    const filePath = path.resolve(
      __dirname,
      '__fixtures__/extract_default_translations/test_plugin_2/test_file.html'
    );

    expect(() => validateMessageNamespace(id, filePath, config.paths, { report })).not.toThrow();
    expect(report.mock.calls).toMatchSnapshot();
  });
});
