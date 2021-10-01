/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mockMakeDirAsync, mockWriteFileAsync } from './integrate_locale_files.test.mocks';

import path from 'path';
import { integrateLocaleFiles, verifyMessages } from './integrate_locale_files';
import { normalizePath } from './utils';

const localePath = path.resolve(__dirname, '__fixtures__', 'integrate_locale_files', 'fr.json');

const mockDefaultMessagesMap = new Map([
  ['plugin-1.message-id-1', { message: 'Message text 1' }],
  ['plugin-1.message-id-2', { message: 'Message text 2' }],
  ['plugin-2.message-id', { message: 'Message text' }],
]);

const defaultIntegrateOptions = {
  sourceFileName: localePath,
  dryRun: false,
  ignoreIncompatible: false,
  ignoreMalformed: false,
  ignoreMissing: false,
  ignoreUnused: false,
  config: {
    paths: {
      'plugin-1': ['src/dev/i18n/__fixtures__/integrate_locale_files/test_plugin_1'],
      'plugin-2': ['src/dev/i18n/__fixtures__/integrate_locale_files/test_plugin_2'],
    },
    exclude: [],
    translations: [],
  },
  log: { success: jest.fn(), warning: jest.fn() } as any,
};

describe('dev/i18n/integrate_locale_files', () => {
  describe('verifyMessages', () => {
    test('validates localized messages', () => {
      const localizedMessagesMap = new Map([
        ['plugin-1.message-id-1', 'Translated text 1'],
        ['plugin-1.message-id-2', 'Translated text 2'],
        ['plugin-2.message-id', 'Translated text'],
      ]);

      expect(() =>
        verifyMessages(localizedMessagesMap, mockDefaultMessagesMap, defaultIntegrateOptions)
      ).not.toThrow();
    });

    test('throws an error for unused id, missing id or the incompatible ones', () => {
      const localizedMessagesMapWithMissingMessage = new Map([
        ['plugin-1.message-id-1', 'Translated text 1'],
        ['plugin-2.message-id', 'Translated text'],
      ]);

      const localizedMessagesMapWithUnusedMessage = new Map([
        ['plugin-1.message-id-1', 'Translated text 1'],
        ['plugin-1.message-id-2', 'Translated text 2'],
        ['plugin-1.message-id-3', 'Translated text 3'],
        ['plugin-2.message-id', 'Translated text'],
      ]);

      const localizedMessagesMapWithIdTypo = new Map([
        ['plugin-1.message-id-1', 'Message text 1'],
        ['plugin-1.message-id-2', 'Message text 2'],
        ['plugin-2.message', 'Message text'],
      ]);

      const localizedMessagesMapWithUnknownValues = new Map([
        ['plugin-1.message-id-1', 'Translated text 1'],
        ['plugin-1.message-id-2', 'Translated text 2 with some unknown {value}'],
        ['plugin-2.message-id', 'Translated text'],
      ]);

      expect(() =>
        verifyMessages(
          localizedMessagesMapWithMissingMessage,
          mockDefaultMessagesMap,
          defaultIntegrateOptions
        )
      ).toThrowErrorMatchingSnapshot();
      expect(() =>
        verifyMessages(
          localizedMessagesMapWithUnusedMessage,
          mockDefaultMessagesMap,
          defaultIntegrateOptions
        )
      ).toThrowErrorMatchingSnapshot();
      expect(() =>
        verifyMessages(
          localizedMessagesMapWithIdTypo,
          mockDefaultMessagesMap,
          defaultIntegrateOptions
        )
      ).toThrowErrorMatchingSnapshot();
      expect(() =>
        verifyMessages(
          localizedMessagesMapWithUnknownValues,
          mockDefaultMessagesMap,
          defaultIntegrateOptions
        )
      ).toThrowErrorMatchingSnapshot();
    });

    test('removes unused ids if `ignoreUnused` is set', () => {
      const localizedMessagesMapWithUnusedMessage = new Map([
        ['plugin-1.message-id-1', 'Translated text 1'],
        ['plugin-1.message-id-2', 'Translated text 2'],
        ['plugin-1.message-id-3', 'Some old translated text 3'],
        ['plugin-2.message-id', 'Translated text'],
        ['plugin-2.message', 'Some old translated text'],
      ]);

      verifyMessages(localizedMessagesMapWithUnusedMessage, mockDefaultMessagesMap, {
        ...defaultIntegrateOptions,
        ignoreUnused: true,
      });

      expect(localizedMessagesMapWithUnusedMessage).toMatchInlineSnapshot(`
Map {
  "plugin-1.message-id-1" => "Translated text 1",
  "plugin-1.message-id-2" => "Translated text 2",
  "plugin-2.message-id" => "Translated text",
}
`);
    });

    test('removes ids with incompatible ICU structure if `ignoreIncompatible` is set', () => {
      const localizedMessagesMapWithIncompatibleMessage = new Map([
        ['plugin-1.message-id-1', 'Translated text 1'],
        ['plugin-1.message-id-2', 'Translated text 2 with some unknown {value}'],
        ['plugin-2.message-id', 'Translated text'],
      ]);

      verifyMessages(localizedMessagesMapWithIncompatibleMessage, mockDefaultMessagesMap, {
        ...defaultIntegrateOptions,
        ignoreIncompatible: true,
      });

      expect(localizedMessagesMapWithIncompatibleMessage).toMatchInlineSnapshot(`
Map {
  "plugin-1.message-id-1" => "Translated text 1",
  "plugin-2.message-id" => "Translated text",
}
`);
    });
  });

  describe('integrateLocaleFiles', () => {
    test('splits locale file by plugins and writes them into the right folders', async () => {
      await integrateLocaleFiles(mockDefaultMessagesMap, defaultIntegrateOptions);

      const [[path1, json1], [path2, json2]] = mockWriteFileAsync.mock.calls;
      const [[dirPath1], [dirPath2]] = mockMakeDirAsync.mock.calls;

      expect([normalizePath(path1), json1]).toMatchSnapshot();
      expect([normalizePath(path2), json2]).toMatchSnapshot();
      expect([normalizePath(dirPath1), normalizePath(dirPath2)]).toMatchSnapshot();
    });
  });
});
