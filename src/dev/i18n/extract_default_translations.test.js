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

const pluginPath1 = path.resolve(
  __dirname,
  '__fixtures__',
  'extract_default_translations',
  'test_plugin_1'
);
const pluginPath2 = path.resolve(
  __dirname,
  '__fixtures__',
  'extract_default_translations',
  'test_plugin_2'
);

describe('dev/i18n/extract_default_translations', () => {
  it('injects default formats into en.json', async () => {
    await extractDefaultTranslations(pluginPath2);

    const extractedJSONBuffer = await readFileAsync(
      path.join(pluginPath2, 'translations', 'en.json')
    );

    await unlinkAsync(path.join(pluginPath2, 'translations', 'en.json'));
    await removeDirAsync(path.join(pluginPath2, 'translations'));

    expect(extractedJSONBuffer.toString()).toMatchSnapshot();
  });
});

describe('extractDefaultTranslations', () => {
  it('extracts messages to en.json', async () => {
    await extractDefaultTranslations(pluginPath1);
    const extractedJSONBuffer = await readFileAsync(
      path.join(pluginPath1, 'translations', 'en.json')
    );

    const expectedJSONFormats = JSON5.stringify(
      { formats: i18n.formats },
      { quote: `'`, space: 2 }
    );

    const expectedJSON = `${expectedJSONFormats.slice(0, -2)}
  'plugin_1.id_1': 'Message 1',
  'plugin_1.id_2': 'Message 2', // Message context
  'plugin_1.id_3': 'Message 3',
  'plugin_1.id_4': 'Message 4',
}
`;

    expect(extractedJSONBuffer.toString()).toEqual(expectedJSON);
  });
});
