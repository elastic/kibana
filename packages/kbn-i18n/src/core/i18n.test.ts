/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as i18nModule from './i18n';
import type { Translation } from '../translation';
import { Formats, defaultEnFormats } from './formats';

const createExpectedTranslations = (
  locale: string,
  overrides: Partial<Translation> = {}
): Translation => {
  return {
    messages: {},
    defaultLocale: 'en',
    defaultFormats: defaultEnFormats,
    formats: {},
    ...overrides,
    locale,
  };
};

describe('I18n engine', () => {
  let i18n: typeof i18nModule;

  beforeEach(() => {
    i18n = jest.requireActual('./i18n');
  });

  afterEach(() => {
    // isolate modules for every test so that local module state doesn't conflict between tests
    jest.resetModules();
    jest.clearAllMocks();
  });

  describe('useTranslation', () => {
    test('should throw error if locale is not specified or empty', () => {
      expect(() =>
        // @ts-expect-error
        i18n.activateTranslation({ messages: { foo: 'bar' } })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[I18n] A \`locale\` must be a non-empty string to add messages."`
      );
      expect(() =>
        i18n.activateTranslation({ locale: '', messages: {} })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[I18n] A \`locale\` must be a non-empty string to add messages."`
      );
    });

    test('should add messages if locale prop is passed as messages property', () => {
      const locale = 'ru';

      expect(i18n.getTranslation()).toEqual(createExpectedTranslations('en'));

      i18n.activateTranslation({
        locale,
        messages: {
          foo: 'bar',
        },
      });

      expect(i18n.getTranslation()).toEqual(
        createExpectedTranslations(locale, {
          messages: {
            foo: 'bar',
          },
        })
      );
    });

    test('should override previously set messages on useTranslations', () => {
      const locale = 'ru';

      i18n.activateTranslation({
        locale,
        messages: {
          ['a.b.c']: 'foo',
        },
      });

      expect(i18n.getTranslation()).toEqual(
        createExpectedTranslations(locale, {
          defaultLocale: 'en',
          messages: {
            ['a.b.c']: 'foo',
          },
        })
      );

      i18n.activateTranslation({
        locale,
        messages: {
          ['d.e.f']: 'bar',
        },
      });

      expect(i18n.getTranslation()).toEqual(
        createExpectedTranslations(locale, {
          locale: 'ru',
          messages: {
            ['d.e.f']: 'bar',
          },
        })
      );

      i18n.activateTranslation({
        locale,
        messages: {
          ['d.e.f']: 'baz',
        },
      });

      expect(i18n.getTranslation()).toEqual(
        createExpectedTranslations(locale, {
          locale: 'ru',
          messages: {
            ['d.e.f']: 'baz',
          },
        })
      );
    });

    test('should add messages with normalized passed locale', () => {
      i18n.activateTranslation({
        locale: 'en-US',
        messages: {
          ['a.b.c']: 'bar',
        },
      });

      expect(i18n.getLocale()).toBe('en-us');
      expect(i18n.getTranslation().locale).toEqual('en-us');
    });
  });

  describe('getTranslation', () => {
    test('should return messages for the current language', () => {
      const locale = 'ru';
      i18n.activateTranslation({
        locale,
        messages: {
          foo: 'bar',
        },
      });

      expect(i18n.getTranslation()).toEqual(
        createExpectedTranslations(locale, {
          messages: {
            foo: 'bar',
          },
        })
      );
    });

    test('should return translation defaults if not i18n is not initialized', () => {
      expect(i18n.getTranslation()).toEqual({
        locale: 'en',
        defaultLocale: 'en',
        messages: {},
        defaultFormats: defaultEnFormats,
        formats: {},
      });
    });
  });

  describe('custom formats', () => {
    test('falls back on defaultFormats if formats is falsey or malforms', () => {
      const setFormats = (formats: unknown) =>
        i18n.activateTranslation({
          locale: 'en',
          messages: {},
          // @ts-expect-error
          formats,
        });

      expect(() => setFormats(undefined)).not.toThrow();
      expect(() => setFormats(null)).not.toThrow();
      expect(() => setFormats(true)).not.toThrow();
      expect(() => setFormats(5)).not.toThrow();
      expect(() => setFormats({})).not.toThrow();
      expect(() => setFormats('foo')).not.toThrow();
    });

    test('should set formats to current formats and keep default formats', () => {
      expect(i18n.getTranslation().defaultFormats.date!.short).toEqual({
        month: 'numeric',
        day: 'numeric',
        year: '2-digit',
      });
      expect(i18n.getTranslation().formats).toEqual({});

      i18n.activateTranslation({
        locale: 'en',
        messages: {},
        formats: {
          date: {
            short: {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            },
          },
        },
      });

      expect(i18n.getTranslation().formats!.date!.short).toEqual({
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      i18n.activateTranslation({
        locale: 'en',
        messages: {},
        formats: {
          date: {
            short: {
              month: 'long',
            },
          },
        },
      });

      expect(i18n.getTranslation().formats!.date!.short).toEqual({
        month: 'long',
      });

      expect(i18n.getTranslation().defaultFormats.date!.short).toEqual({
        month: 'numeric',
        day: 'numeric',
        year: '2-digit',
      });
    });
  });

  describe('formats', () => {
    test('should return "en" formats by default', () => {
      i18n.init({ locale: 'fr', messages: {} });

      expect(i18n.getTranslation().defaultFormats).toEqual(defaultEnFormats);
    });

    test('should return updated formats', () => {
      const customFormats: Formats = {
        number: {
          currency: {
            style: 'currency',
            currency: 'EUR',
          },
        },
      };

      i18n.init({
        locale: 'en',
        messages: {},
        formats: customFormats,
      });
      const { defaultFormats, formats } = i18n.getTranslation();

      expect(defaultFormats).toEqual(defaultEnFormats);
      expect(formats).toEqual(customFormats);
    });
  });

  describe('translate', () => {
    test('should throw error if id is not a non-empty string', () => {
      expect(() => i18n.translate(undefined as any, {} as any)).toThrowErrorMatchingInlineSnapshot(
        `"[I18n] An \`id\` must be a non-empty string to translate a message."`
      );
      expect(() => i18n.translate(null as any, {} as any)).toThrowErrorMatchingInlineSnapshot(
        `"[I18n] An \`id\` must be a non-empty string to translate a message."`
      );
      expect(() => i18n.translate(true as any, {} as any)).toThrowErrorMatchingInlineSnapshot(
        `"[I18n] An \`id\` must be a non-empty string to translate a message."`
      );
      expect(() => i18n.translate(5 as any, {} as any)).toThrowErrorMatchingInlineSnapshot(
        `"[I18n] An \`id\` must be a non-empty string to translate a message."`
      );
      expect(() => i18n.translate({} as any, {} as any)).toThrowErrorMatchingInlineSnapshot(
        `"[I18n] An \`id\` must be a non-empty string to translate a message."`
      );
      expect(() => i18n.translate('', {} as any)).toThrowErrorMatchingInlineSnapshot(
        `"[I18n] An \`id\` must be a non-empty string to translate a message."`
      );
    });

    test('should throw error if translation message and defaultMessage are not provided', () => {
      expect(() => i18n.translate('foo', {} as any)).toThrowErrorMatchingInlineSnapshot(`
        "[I18n] Error formatting the default message for: \\"foo\\".
        Error: Missing \`defaultMessage\`."
      `);

      i18n.init({
        locale: 'en',
        messages: {
          ['a.b.c']: 'foo',
        },
      });

      expect(() => i18n.translate('a.b.c', {} as any)).toThrowErrorMatchingInlineSnapshot(`
        "[I18n] Error formatting the default message for: \\"a.b.c\\".
        Error: Missing \`defaultMessage\`."
      `);
    });

    test('should return default message as is if values are not provided', () => {
      expect(i18n.translate('a.b.c', { defaultMessage: 'foo' })).toBe('foo');
    });

    test('should not return defaultMessage as is if values are provided', () => {
      i18n.init({
        locale: 'en',
        messages: {
          ['a.b.c']: 'foo',
        },
      });
      expect(i18n.translate('a.b.c', { defaultMessage: 'bar' })).toBe('foo');
    });

    test('should interpolate variables', () => {
      i18n.init({
        locale: 'en',
        messages: {
          ['a.b.c']: 'foo {a}, {b}, {c} bar',
          ['d.e.f']: '{foo}',
        },
      });

      expect(
        i18n.translate('a.b.c', {
          defaultMessage: 'UNUSED',
          values: { a: 1, b: 2, c: 3 },
        } as any)
      ).toBe('foo 1, 2, 3 bar');

      expect(
        i18n.translate('d.e.f', { defaultMessage: 'UNUSED', values: { foo: 'bar' } } as any)
      ).toBe('bar');
    });

    test('should interpolate variables for default messages', () => {
      expect(
        i18n.translate('a.b.c', {
          defaultMessage: 'foo {a}, {b}, {c} bar',
          values: { a: 1, b: 2, c: 3 },
        })
      ).toBe('foo 1, 2, 3 bar');
    });

    test('should format pluralized messages', () => {
      i18n.init({
        locale: 'en',
        messages: {
          ['a.b.c']: `You have {numPhotos, plural,
                      =0 {no photos.}
                      =1 {one photo.}
                      other {# photos.}
                   }`,
        },
      });

      expect(
        i18n.translate('a.b.c', { defaultMessage: 'UNUSED', values: { numPhotos: 0 } } as any)
      ).toBe('You have no photos.');
      expect(
        i18n.translate('a.b.c', { defaultMessage: 'UNUSED', values: { numPhotos: 1 } } as any)
      ).toBe('You have one photo.');
      expect(
        i18n.translate('a.b.c', { defaultMessage: 'UNUSED', values: { numPhotos: 1000 } } as any)
      ).toBe('You have 1,000 photos.');
    });

    test('should format pluralized default messages', () => {
      expect(
        i18n.translate('a.b.c', {
          values: { numPhotos: 0 },
          defaultMessage: `You have {numPhotos, plural,
                             =0 {no photos.}
                             =1 {one photo.}
                             other {# photos.}
                          }`,
        })
      ).toBe('You have no photos.');

      expect(
        i18n.translate('a.b.c', {
          values: { numPhotos: 1 },
          defaultMessage: `You have {numPhotos, plural,
                             =0 {no photos.}
                             =1 {one photo.}
                             other {# photos.}
                          }`,
        })
      ).toBe('You have one photo.');

      expect(
        i18n.translate('a.b.c', {
          values: { numPhotos: 1000 },
          defaultMessage: `You have {numPhotos, plural,
                             =0 {no photos.}
                             =1 {one photo.}
                             other {# photos.}
                          }`,
        })
      ).toBe('You have 1,000 photos.');
    });

    test('should throw error if wrong context is provided to the translation string', () => {
      i18n.init({
        locale: 'en',
        messages: {
          ['a.b.c']: `You have {numPhotos, plural,
                      =0 {no photos.}
                      =1 {one photo.}
                      other {# photos.}
                   }`,
        },
      });

      expect(() => i18n.translate('a.b.c', { values: { foo: 0 } } as any))
        .toThrowErrorMatchingInlineSnapshot(`
        "[I18n] Error formatting the default message for: \\"a.b.c\\".
        Error: Missing \`defaultMessage\`."
      `);

      expect(() =>
        i18n.translate('d.e.f', {
          values: { bar: 1000 },
          defaultMessage: `You have {numPhotos, plural,
                             =0 {no photos.}
                             =1 {one photo.}
                             other {# photos.}
                          }`,
        })
      ).toThrowErrorMatchingSnapshot();
    });

    test('should format messages with percent formatter', () => {
      i18n.init({
        locale: 'en',
        messages: {},
      });

      expect(
        i18n.translate('a.b.c', {
          defaultMessage: 'Result: {result, number, percent}',
          values: { result: 0.15 },
        })
      ).toBe('Result: 15%');

      expect(
        i18n.translate('d.e.f', {
          values: { result: 0.15 },
          defaultMessage: 'Result: {result, number, percent}',
        })
      ).toBe('Result: 15%');
    });

    test('should format messages with date formatter', () => {
      i18n.init({
        locale: 'en',
        messages: {},
      });

      expect(
        i18n.translate('a.short', {
          defaultMessage: 'Sale begins {start, date, short}',
          values: { start: new Date(2018, 5, 20) },
        } as any)
      ).toBe('Sale begins 6/20/18');

      expect(
        i18n.translate('a.medium', {
          defaultMessage: 'Sale begins {start, date, medium}',
          values: { start: new Date(2018, 5, 20) },
        } as any)
      ).toBe('Sale begins Jun 20, 2018');

      expect(
        i18n.translate('a.long', {
          defaultMessage: 'Sale begins {start, date, long}',
          values: { start: new Date(2018, 5, 20) },
        } as any)
      ).toBe('Sale begins June 20, 2018');

      expect(
        i18n.translate('a.full', {
          defaultMessage: 'Sale begins {start, date, full}',
          values: { start: new Date(2018, 5, 20) },
        } as any)
      ).toBe('Sale begins Wednesday, June 20, 2018');
    });

    test('should format default messages with date formatter', () => {
      expect(
        i18n.translate('foo', {
          defaultMessage: 'Sale begins {start, date, short}',
          values: { start: new Date(2018, 5, 20) },
        })
      ).toBe('Sale begins 6/20/18');

      expect(
        i18n.translate('foo', {
          defaultMessage: 'Sale begins {start, date, medium}',
          values: { start: new Date(2018, 5, 20) },
        })
      ).toBe('Sale begins Jun 20, 2018');

      expect(
        i18n.translate('foo', {
          defaultMessage: 'Sale begins {start, date, long}',
          values: { start: new Date(2018, 5, 20) },
        })
      ).toBe('Sale begins June 20, 2018');

      expect(
        i18n.translate('foo', {
          defaultMessage: 'Sale begins {start, date, full}',
          values: { start: new Date(2018, 5, 20) },
        })
      ).toBe('Sale begins Wednesday, June 20, 2018');
    });

    test('should format messages with time formatter', () => {
      i18n.init({
        locale: 'en',
        messages: {
          ['a.short']: 'Coupon expires at {expires, time, short}',
          ['a.medium']: 'Coupon expires at {expires, time, medium}',
        },
      });

      expect(
        i18n.translate('a.short', {
          defaultMessage: 'UNUSED',
          values: { expires: new Date(2018, 5, 20, 18, 40, 30, 50) },
        } as any)
      ).toBe('Coupon expires at 6:40 PM');

      expect(
        i18n.translate('a.medium', {
          defaultMessage: 'UNUSED',
          values: { expires: new Date(2018, 5, 20, 18, 40, 30, 50) },
        } as any)
      ).toBe('Coupon expires at 6:40:30 PM');
    });

    test('should format default messages with time formatter', () => {
      expect(
        i18n.translate('foo', {
          defaultMessage: 'Coupon expires at {expires, time, short}',
          values: { expires: new Date(2018, 5, 20, 18, 40, 30, 50) },
        })
      ).toBe('Coupon expires at 6:40 PM');

      expect(
        i18n.translate('foo', {
          defaultMessage: 'Coupon expires at {expires, time, medium}',
          values: { expires: new Date(2018, 5, 20, 18, 40, 30, 50) },
        })
      ).toBe('Coupon expires at 6:40:30 PM');
    });

    test('should format default message with a custom format', () => {
      i18n.init({
        locale: 'en',
        formats: {
          number: {
            currency: { style: 'currency' },
          },
        },
        messages: {},
      });

      expect(
        i18n.translate('a.b.c', {
          defaultMessage: 'Your total is {total, number, ::currency/USD}',
          values: { total: 1000 },
        })
      ).toBe('Your total is $1,000.00');

      i18n.init({
        locale: 'en',
        formats: {
          number: {
            currency: {
              style: 'currency',
              currencyDisplay: 'name',
              currencySign: 'accounting',
              currency: 'EUR',
              roundingMode: 'floor',
            },
          },
        },
        messages: {},
      });

      expect(
        i18n.translate('a.b.c', {
          defaultMessage: 'Your total is {total, number, ::currency/EUR}',
          values: { total: 1000.12 },
        })
      ).toBe('Your total is 1,000.12');
    });

    test('should use default format if passed format option is not specified', () => {
      i18n.init({
        locale: 'en',
        messages: {
          ['a.b.c']: 'Your total is {total, number, usd}',
        },
      });

      expect(i18n.translate('a.b.c', { values: { total: 1000 } } as any)).toBe(
        'Your total is 1,000'
      );

      expect(
        i18n.translate('d.e.f', {
          values: { total: 1000 },
          defaultMessage: 'Your total is {total, number, foo}',
        })
      ).toBe('Your total is 1,000');
    });

    test('should throw error if used format is not specified', () => {
      i18n.init({
        locale: 'en',
        messages: {
          ['a.b.c']: 'Your total is {total, foo}',
        },
      });

      expect(() => i18n.translate('a.b.c', { values: { total: 1 } } as any))
        .toThrowErrorMatchingInlineSnapshot(`
        "[I18n] Error formatting the default message for: \\"a.b.c\\".
        Error: Missing \`defaultMessage\`."
      `);

      expect(() =>
        i18n.translate('d.e.f', {
          values: { total: 1000 },
          defaultMessage: 'Your total is {total, bar}',
        })
      ).toThrowErrorMatchingInlineSnapshot(`
        "[I18n] Error formatting the default message for: \\"d.e.f\\".
        Error: [@formatjs/intl Error FORMAT_ERROR] Error formatting default message for: \\"d.e.f\\", rendering default message verbatim
        MessageID: d.e.f
        Default Message: Your total is {total, bar}
        Description: undefined

        Locale: en


        INVALID_ARGUMENT_TYPE
        SyntaxError: INVALID_ARGUMENT_TYPE
            at Function.parse [as __parse] (/Users/bamieh/Bamieh/elastic/kibana/node_modules/@formatjs/icu-messageformat-parser/index.js:34:21)
            at new IntlMessageFormat (/Users/bamieh/Bamieh/elastic/kibana/node_modules/intl-messageformat/src/core.js:140:42)
            at /Users/bamieh/Bamieh/elastic/kibana/node_modules/@formatjs/intl/src/utils.js:115:20
            at variadic (/Users/bamieh/Bamieh/elastic/kibana/node_modules/@formatjs/fast-memoize/index.js:37:28)
            at formatMessage (/Users/bamieh/Bamieh/elastic/kibana/node_modules/@formatjs/intl/src/message.js:72:39)
            at Object.formatMessage [as translate] (/Users/bamieh/Bamieh/elastic/kibana/packages/kbn-i18n/src/core/i18n.ts:141:17)
            at translate (/Users/bamieh/Bamieh/elastic/kibana/packages/kbn-i18n/src/core/i18n.test.ts:678:14)
            at _toThrowErrorMatchingSnapshot (/Users/bamieh/Bamieh/elastic/kibana/node_modules/jest-snapshot/build/index.js:569:7)
            at Object.toThrowErrorMatchingInlineSnapshot (/Users/bamieh/Bamieh/elastic/kibana/node_modules/jest-snapshot/build/index.js:510:10)
            at __EXTERNAL_MATCHER_TRAP__ (/Users/bamieh/Bamieh/elastic/kibana/node_modules/expect/build/index.js:325:30)
            at Object.throwingMatcher [as toThrowErrorMatchingInlineSnapshot] (/Users/bamieh/Bamieh/elastic/kibana/node_modules/expect/build/index.js:326:15)
            at Object.toThrowErrorMatchingInlineSnapshot (/Users/bamieh/Bamieh/elastic/kibana/packages/kbn-i18n/src/core/i18n.test.ts:682:9)
            at Promise.then.completed (/Users/bamieh/Bamieh/elastic/kibana/node_modules/jest-circus/build/utils.js:300:28)
            at new Promise (<anonymous>)
            at callAsyncCircusFn (/Users/bamieh/Bamieh/elastic/kibana/node_modules/jest-circus/build/utils.js:233:10)
            at _callCircusTest (/Users/bamieh/Bamieh/elastic/kibana/node_modules/jest-circus/build/run.js:314:40)
            at processTicksAndRejections (node:internal/process/task_queues:95:5)
            at _runTest (/Users/bamieh/Bamieh/elastic/kibana/node_modules/jest-circus/build/run.js:250:3)
            at _runTestsForDescribeBlock (/Users/bamieh/Bamieh/elastic/kibana/node_modules/jest-circus/build/run.js:125:9)
            at _runTestsForDescribeBlock (/Users/bamieh/Bamieh/elastic/kibana/node_modules/jest-circus/build/run.js:120:9)
            at _runTestsForDescribeBlock (/Users/bamieh/Bamieh/elastic/kibana/node_modules/jest-circus/build/run.js:120:9)
            at run (/Users/bamieh/Bamieh/elastic/kibana/node_modules/jest-circus/build/run.js:70:3)
            at runAndTransformResultsToJestFormat (/Users/bamieh/Bamieh/elastic/kibana/node_modules/jest-circus/build/legacy-code-todo-rewrite/jestAdapterInit.js:122:21)
            at jestAdapter (/Users/bamieh/Bamieh/elastic/kibana/node_modules/jest-circus/build/legacy-code-todo-rewrite/jestAdapter.js:79:19)
            at runTestInternal (/Users/bamieh/Bamieh/elastic/kibana/node_modules/jest-runner/build/runTest.js:367:16)
            at runTest (/Users/bamieh/Bamieh/elastic/kibana/node_modules/jest-runner/build/runTest.js:444:34)
            at Object.worker (/Users/bamieh/Bamieh/elastic/kibana/node_modules/jest-runner/build/testWorker.js:106:12)"
      `);
    });
  });

  describe('init', () => {
    test('should not initialize the engine if messages are not specified', () => {
      i18n.init();
      expect(i18n.getTranslation()).toEqual(createExpectedTranslations('en', { messages: {} }));
    });

    test('should throw error if locale is not specified', () => {
      expect(() => i18n.init({ locale: '', messages: {} })).toThrowErrorMatchingInlineSnapshot(
        `"[I18n] A \`locale\` must be a non-empty string to add messages."`
      );

      // @ts-expect-error
      expect(() => i18n.init({ messages: {} })).toThrowErrorMatchingInlineSnapshot(
        `"[I18n] A \`locale\` must be a non-empty string to add messages."`
      );
    });

    test('should add messages if locale is specified', () => {
      const locale = 'en';
      i18n.init({
        locale,
        messages: {
          foo: 'bar',
        },
      });

      expect(i18n.getTranslation()).toEqual(
        createExpectedTranslations(locale, {
          messages: {
            foo: 'bar',
          },
        })
      );
    });

    test('should set the current locale', () => {
      i18n.init({ locale: 'ru', messages: {} });
      expect(i18n.getLocale()).toBe('ru');
    });

    test('should add custom formats', () => {
      i18n.init({
        locale: 'ru',
        formats: {
          date: {
            custom: {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            },
          },
        },
        messages: {},
      });

      expect(i18n.getTranslation().formats?.date).toEqual({
        custom: {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        },
      });
    });
  });

  describe('load', () => {
    let mockFetch: jest.SpyInstance;
    beforeEach(() => {
      mockFetch = jest.spyOn(global as any, 'fetch').mockImplementation();
    });

    test('fails if server returns >= 300 status code', async () => {
      mockFetch.mockResolvedValue({ status: 301 });

      await expect(i18n.load('some-url')).rejects.toMatchInlineSnapshot(
        `[Error: Translations request failed with status code: 301]`
      );

      mockFetch.mockResolvedValue({ status: 404 });

      await expect(i18n.load('some-url')).rejects.toMatchInlineSnapshot(
        `[Error: Translations request failed with status code: 404]`
      );
    });

    test('initializes engine with received translations', async () => {
      const translations: Omit<Translation, 'defaultLocale'> = {
        locale: 'en-XA',
        formats: {
          number: { currency: { style: 'currency' } },
        },
        messages: { 'common.ui.someLabel': 'some label' },
      };

      mockFetch.mockResolvedValue({
        status: 200,
        json: jest.fn().mockResolvedValue(translations),
      });

      await expect(i18n.load('some-url')).resolves.toBeUndefined();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith('some-url', { credentials: 'same-origin' });

      expect(i18n.getTranslation()).toEqual(createExpectedTranslations('en-xa', translations));
    });
  });
});
