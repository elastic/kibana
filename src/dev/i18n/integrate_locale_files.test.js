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

import { verifyMessages, integrateLocaleFiles } from './integrate_locale_files';
import { normalizePath } from './utils';

const localesPath = path.resolve(__dirname, '__fixtures__', 'integrate_locale_files');

const defaultMessagesMap = new Map([
  ['plugin-1.message-id-1', 'Message text 1'],
  ['plugin-1.message-id-2', 'Message text 2'],
  ['plugin-2.message-id', 'Message text'],
]);

jest.mock('../../../.i18nrc.json', () => ({
  paths: {
    'plugin-1': 'src/dev/i18n/__fixtures__/integrate_locale_files/test_plugin_1',
    'plugin-2': 'src/dev/i18n/__fixtures__/integrate_locale_files/test_plugin_2',
  },
  exclude: [],
}));

const utils = require('./utils');
utils.writeFileAsync = jest.fn();

describe('dev/i18n/check_locale_files', () => {
  describe('verifyMessages', () => {
    it('validates locale messages object', () => {
      const localeMessages = {
        formats: {},
        'plugin-1.message-id-1': 'Translated text 1',
        'plugin-1.message-id-2': 'Translated text 2',
        'plugin-2.message-id': 'Translated text',
      };

      expect(() => verifyMessages(localeMessages, defaultMessagesMap)).not.toThrow();
    });

    it('throws an error for unused id and missing id', () => {
      const localeMessagesWithMissingMessage = {
        formats: {},
        'plugin-1.message-id-1': 'Translated text 1',
        'plugin-2.message-id': 'Translated text',
      };

      const localeMessagesWithUnusedMessage = {
        formats: {},
        'plugin-1.message-id-1': 'Translated text 1',
        'plugin-1.message-id-2': 'Translated text 2',
        'plugin-1.message-id-3': 'Translated text 3',
        'plugin-2.message-id': 'Translated text',
      };

      expect(() =>
        verifyMessages(localeMessagesWithMissingMessage, defaultMessagesMap)
      ).toThrowErrorMatchingSnapshot();
      expect(() =>
        verifyMessages(localeMessagesWithUnusedMessage, defaultMessagesMap)
      ).toThrowErrorMatchingSnapshot();
    });
  });

  describe('integrateLocaleFiles', () => {
    it('splits locale file by plugins and moves it to plugins folders', async () => {
      await integrateLocaleFiles(localesPath, defaultMessagesMap);

      const [[path1, json1], [path2, json2]] = utils.writeFileAsync.mock.calls;

      expect([normalizePath(path1), json1]).toMatchSnapshot();
      expect([normalizePath(path2), json2]).toMatchSnapshot();
    });
  });
});
