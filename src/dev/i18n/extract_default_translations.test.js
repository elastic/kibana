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
import fs from 'fs';
import { promisify } from 'util';

import { extractDefaultTranslations } from './extract_default_translations';

const readFileAsync = promisify(fs.readFile);
const removeDirAsync = promisify(fs.rmdir);
const unlinkAsync = promisify(fs.unlink);

const fixturesPath = path.resolve(__dirname, '__fixtures__', 'extract_default_translations');
const pluginsPaths = [
  path.join(fixturesPath, 'test_plugin_1'),
  path.join(fixturesPath, 'test_plugin_2'),
  path.join(fixturesPath, 'test_plugin_3'),
];

describe('dev/i18n/extract_default_translations', () => {
  test('extracts messages to en.json', async () => {
    const [pluginPath] = pluginsPaths;
    await extractDefaultTranslations(pluginPath);

    const extractedJSONBuffer = await readFileAsync(
      path.join(pluginPath, 'translations', 'en.json')
    );

    await unlinkAsync(path.join(pluginPath, 'translations', 'en.json'));
    await removeDirAsync(path.join(pluginPath, 'translations'));

    expect(extractedJSONBuffer.toString()).toMatchSnapshot();
  });

  test('injects default formats into en.json', async () => {
    const [, pluginPath] = pluginsPaths;
    await extractDefaultTranslations(pluginPath);

    const extractedJSONBuffer = await readFileAsync(
      path.join(pluginPath, 'translations', 'en.json')
    );

    await unlinkAsync(path.join(pluginPath, 'translations', 'en.json'));
    await removeDirAsync(path.join(pluginPath, 'translations'));

    expect(extractedJSONBuffer.toString()).toMatchSnapshot();
  });

  test('throws on id collision', async () => {
    const [, , pluginPath] = pluginsPaths;
    await expect(extractDefaultTranslations(pluginPath)).rejects.toMatchObject({
      message: `Error in ${path.join(pluginPath, 'test_file.jsx')}
There is more than one default message for the same id "plugin_3.duplicate_id": "Message 1" and "Message 2"`,
    });
  });
});
