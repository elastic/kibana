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

import { resolve } from 'path';
import fs from 'fs';
import { promisify } from 'util';

import { extractDefaultTranslations } from './extract_default_translations';

const readFileAsync = promisify(fs.readFile);
const removeDirAsync = promisify(fs.rmdir);
const unlinkAsync = promisify(fs.unlink);

const PLUGIN_PATH = resolve(__dirname, '__fixtures__', 'test_plugin');

describe('dev/i18n/extract_default_translations', () => {
  it('injects default formats into en.json', async () => {
    await extractDefaultTranslations(PLUGIN_PATH);

    const extractedJSONBuffer = await readFileAsync(
      resolve(PLUGIN_PATH, 'translations', 'en.json')
    );

    await unlinkAsync(resolve(PLUGIN_PATH, 'translations', 'en.json'));
    await removeDirAsync(resolve(PLUGIN_PATH, 'translations'));

    expect(extractedJSONBuffer.toString()).toMatchSnapshot();
  });
});
