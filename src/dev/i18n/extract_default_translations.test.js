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
import JSON5 from 'json5';
import { i18n } from '@kbn/i18n';

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
  it('extracts messages to en.json', async () => {
    await extractDefaultTranslations(pluginsPaths[0]);

    const extractedJSONBuffer = await readFileAsync(
      path.join(pluginsPaths[0], 'translations', 'en.json')
    );

    await unlinkAsync(path.join(pluginsPaths[0], 'translations', 'en.json'));
    await removeDirAsync(path.join(pluginsPaths[0], 'translations'));

    const expectedJSONFormats = JSON5.stringify(
      { formats: i18n.formats },
      { quote: `'`, space: 2 }
    );

    const expectedJSON = `${expectedJSONFormats.slice(0, -2)}
  'plugin_1.id_1': 'Message 1',
  'plugin_1.id_2': 'Message 2', // Message context
  'plugin_1.id_3': 'Message 3',
  'plugin_1.id_4': 'Message 4',
  'plugin_1.id_5': 'Message 5',
  'plugin_1.id_6': 'Message 6',
  'plugin_1.id_7': 'Message 7',
}
`;

    expect(extractedJSONBuffer.toString()).toEqual(expectedJSON);
  });

  it('injects default formats into en.json', async () => {
    await extractDefaultTranslations(pluginsPaths[1]);

    const extractedJSONBuffer = await readFileAsync(
      path.join(pluginsPaths[1], 'translations', 'en.json')
    );

    await unlinkAsync(path.join(pluginsPaths[1], 'translations', 'en.json'));
    await removeDirAsync(path.join(pluginsPaths[1], 'translations'));

    expect(extractedJSONBuffer.toString()).toMatchSnapshot();
  });

  it('throws on id collision', async () => {
    await expect(extractDefaultTranslations(pluginsPaths[2])).rejects.toMatchObject({
      message: `Error in ${path.join(pluginsPaths[2], 'test_file.jsx')}
There is more than one default message for the same id "plugin_3.duplicate_id": "Message 1" and "Message 2"`,
    });
  });
});
