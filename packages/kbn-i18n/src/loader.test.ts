/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { join } from 'path';

describe('I18n loader', () => {
  let i18nLoader: typeof import('./loader');

  beforeEach(() => {
    i18nLoader = require('./loader');
  });

  afterEach(() => {
    // isolate modules for every test so that local module state doesn't conflict between tests
    jest.resetModules();
  });

  describe('registerTranslationFile', () => {
    test('should throw error if path to translation file is not specified', () => {
      expect(() =>
        i18nLoader.registerTranslationFile(undefined as any)
      ).toThrowErrorMatchingSnapshot();
    });

    test('should throw error if path to translation file is not an absolute', () => {
      expect(() => i18nLoader.registerTranslationFile('./en.json')).toThrowErrorMatchingSnapshot();
    });

    test('should throw error if path to translation file does not have an extension', () => {
      expect(() =>
        i18nLoader.registerTranslationFile(
          join(__dirname, './__fixtures__/test_plugin_1/translations/en')
        )
      ).toThrow();
    });

    test('should throw error if translation file is not a json', () => {
      expect(() =>
        i18nLoader.registerTranslationFile(
          join(__dirname, './__fixtures__/test_plugin_1/translations/en.txt')
        )
      ).toThrow();
    });

    test('should register a translation file', () => {
      expect(i18nLoader.getRegisteredLocales()).toEqual([]);

      i18nLoader.registerTranslationFile(
        join(__dirname, './__fixtures__/test_plugin_1/translations/en.json')
      );

      expect(i18nLoader.getRegisteredLocales()).toEqual(['en']);

      i18nLoader.registerTranslationFile(
        join(__dirname, './__fixtures__/test_plugin_1/translations/en-US.json')
      );

      expect(i18nLoader.getRegisteredLocales()).toContain('en');
      expect(i18nLoader.getRegisteredLocales()).toContain('en-US');
      expect(i18nLoader.getRegisteredLocales().length).toBe(2);
    });
  });

  describe('registerTranslationFiles', () => {
    test('should register array of translation files', () => {
      expect(i18nLoader.getRegisteredLocales()).toEqual([]);

      i18nLoader.registerTranslationFiles([
        join(__dirname, './__fixtures__/test_plugin_1/translations/en.json'),
        join(__dirname, './__fixtures__/test_plugin_1/translations/en-US.json'),
      ]);

      expect(i18nLoader.getRegisteredLocales()).toContain('en');
      expect(i18nLoader.getRegisteredLocales()).toContain('en-US');
      expect(i18nLoader.getRegisteredLocales().length).toBe(2);
    });
  });

  describe('getTranslationsByLocale', () => {
    test('should return translation messages by specified locale', async () => {
      i18nLoader.registerTranslationFile(
        join(__dirname, './__fixtures__/test_plugin_1/translations/en.json')
      );

      expect(await i18nLoader.getTranslationsByLocale('en')).toEqual({
        locale: 'en',
        messages: {
          ['a.b.c']: 'foo',
          ['d.e.f']: 'bar',
        },
      });
    });

    test('should return empty object if passed locale is not registered', async () => {
      i18nLoader.registerTranslationFile(
        join(__dirname, './__fixtures__/test_plugin_1/translations/en.json')
      );

      expect(await i18nLoader.getTranslationsByLocale('ru')).toEqual({ messages: {} });
    });

    test('should return translation messages from a couple of files by specified locale', async () => {
      i18nLoader.registerTranslationFiles([
        join(__dirname, './__fixtures__/test_plugin_1/translations/en.json'),
        join(__dirname, './__fixtures__/test_plugin_2/translations/en.json'),
      ]);

      expect(await i18nLoader.getTranslationsByLocale('en')).toEqual({
        locale: 'en',
        messages: {
          ['a.b.c']: 'foo',
          ['d.e.f']: 'bar',
          ['a.b.c.custom']: 'foo.custom',
          ['d.e.f.custom']: 'bar.custom',
        },
      });
    });

    test('should return translation messages for different locales', async () => {
      i18nLoader.registerTranslationFiles([
        join(__dirname, './__fixtures__/test_plugin_1/translations/en.json'),
        join(__dirname, './__fixtures__/test_plugin_1/translations/en-US.json'),
        join(__dirname, './__fixtures__/test_plugin_2/translations/en.json'),
        join(__dirname, './__fixtures__/test_plugin_2/translations/ru.json'),
      ]);

      expect(await i18nLoader.getTranslationsByLocale('en')).toEqual({
        locale: 'en',
        messages: {
          ['a.b.c']: 'foo',
          ['d.e.f']: 'bar',
          ['a.b.c.custom']: 'foo.custom',
          ['d.e.f.custom']: 'bar.custom',
        },
      });

      expect(await i18nLoader.getTranslationsByLocale('en-US')).toEqual({
        locale: 'en-US',
        messages: {
          ['a.b.c']: 'bar',
          ['d.e.f']: 'foo',
        },
      });

      expect(await i18nLoader.getTranslationsByLocale('ru')).toEqual({
        locale: 'ru',
        messages: {
          test: 'test',
        },
      });
    });

    test('should return translation messages from JSON file', async () => {
      i18nLoader.registerTranslationFile(
        join(__dirname, './__fixtures__/test_plugin_2/translations/fr.json')
      );

      expect(await i18nLoader.getTranslationsByLocale('fr')).toEqual({
        locale: 'fr',
        messages: {
          test: 'test',
        },
      });
    });
  });

  describe('getAllTranslations', () => {
    test('should return translation messages for all registered locales', async () => {
      i18nLoader.registerTranslationFiles([
        join(__dirname, './__fixtures__/test_plugin_1/translations/en.json'),
        join(__dirname, './__fixtures__/test_plugin_1/translations/en-US.json'),
        join(__dirname, './__fixtures__/test_plugin_2/translations/en.json'),
        join(__dirname, './__fixtures__/test_plugin_2/translations/ru.json'),
      ]);

      expect(await i18nLoader.getAllTranslations()).toEqual({
        en: {
          locale: 'en',
          messages: {
            ['a.b.c']: 'foo',
            ['d.e.f']: 'bar',
            ['a.b.c.custom']: 'foo.custom',
            ['d.e.f.custom']: 'bar.custom',
          },
        },
        ['en-US']: {
          locale: 'en-US',
          messages: {
            ['a.b.c']: 'bar',
            ['d.e.f']: 'foo',
          },
        },
        ru: {
          locale: 'ru',
          messages: {
            test: 'test',
          },
        },
      });
    });

    test('should return empty object if there are no registered locales', async () => {
      expect(await i18nLoader.getAllTranslations()).toEqual({});
    });
  });

  describe('getAllTranslationsFromPaths', () => {
    test('should return translation messages for all passed paths to translation files', async () => {
      expect(
        await i18nLoader.getAllTranslationsFromPaths([
          join(__dirname, './__fixtures__/test_plugin_1/translations/en.json'),
          join(__dirname, './__fixtures__/test_plugin_1/translations/en-US.json'),
          join(__dirname, './__fixtures__/test_plugin_2/translations/en.json'),
          join(__dirname, './__fixtures__/test_plugin_2/translations/ru.json'),
        ])
      ).toEqual({
        en: {
          locale: 'en',
          messages: {
            ['a.b.c']: 'foo',
            ['d.e.f']: 'bar',
            ['a.b.c.custom']: 'foo.custom',
            ['d.e.f.custom']: 'bar.custom',
          },
        },
        ['en-US']: {
          locale: 'en-US',
          messages: {
            ['a.b.c']: 'bar',
            ['d.e.f']: 'foo',
          },
        },
        ru: {
          locale: 'ru',
          messages: {
            test: 'test',
          },
        },
      });
    });

    test('should return empty object if there are no translation files', async () => {
      expect(await i18nLoader.getAllTranslationsFromPaths(undefined as any)).toEqual({});
    });
  });
});
