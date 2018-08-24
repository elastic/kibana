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

describe('I18n engine', () => {
  let i18n;

  beforeEach(() => {
    i18n = require('./i18n');
  });

  afterEach(() => {
    // isolate modules for every test so that local module state doesn't conflict between tests
    jest.resetModules();
  });

  describe('addMessages', () => {
    test('should throw error if locale is not specified or empty', () => {
      expect(() => i18n.addMessages({ foo: 'bar' })).toThrowErrorMatchingSnapshot();
      expect(() => i18n.addMessages({ locale: '' })).toThrowErrorMatchingSnapshot();
    });

    test('should throw error if locale specified in messages is different from one provided as second argument', () => {
      expect(() =>
        i18n.addMessages({ foo: 'bar', locale: 'en' }, 'ru')
      ).toThrowErrorMatchingSnapshot();
    });

    test('should add messages if locale prop is passed as second argument', () => {
      const locale = 'ru';

      expect(i18n.getMessages()).toEqual({});

      i18n.addMessages({ foo: 'bar' }, locale);

      expect(i18n.getMessages()).toEqual({});

      i18n.setLocale(locale);

      expect(i18n.getMessages()).toEqual({ foo: 'bar' });
    });

    test('should add messages if locale prop is passed as messages property', () => {
      const locale = 'ru';

      expect(i18n.getMessages()).toEqual({});

      i18n.addMessages({
        locale,
        foo: 'bar',
      });

      expect(i18n.getMessages()).toEqual({});

      i18n.setLocale(locale);

      expect(i18n.getMessages()).toEqual({
        foo: 'bar',
        locale: 'ru',
      });
    });

    test('should merge messages with the same locale', () => {
      const locale = 'ru';

      i18n.setLocale(locale);
      i18n.addMessages({
        locale,
        ['a.b.c']: 'foo',
      });

      expect(i18n.getMessages()).toEqual({
        locale: 'ru',
        ['a.b.c']: 'foo',
      });

      i18n.addMessages({
        locale,
        ['d.e.f']: 'bar',
      });

      expect(i18n.getMessages()).toEqual({
        locale: 'ru',
        ['a.b.c']: 'foo',
        ['d.e.f']: 'bar',
      });
    });

    test('should override messages with the same locale and id', () => {
      const locale = 'ru';

      i18n.setLocale(locale);
      i18n.addMessages({
        locale,
        ['a.b.c']: 'foo',
      });

      expect(i18n.getMessages()).toEqual({
        locale: 'ru',
        ['a.b.c']: 'foo',
      });

      i18n.addMessages({
        locale,
        ['a.b.c']: 'bar',
      });

      expect(i18n.getMessages()).toEqual({
        locale: 'ru',
        ['a.b.c']: 'bar',
      });
    });

    test('should add messages with normalized passed locale', () => {
      const locale = 'en-us';
      i18n.setLocale(locale);

      i18n.addMessages(
        {
          ['a.b.c']: 'bar',
        },
        'en_US'
      );

      expect(i18n.getLocale()).toBe(locale);
      expect(i18n.getMessages()).toEqual({
        ['a.b.c']: 'bar',
      });
    });
  });

  describe('getMessages', () => {
    test('should return messages for the current language', () => {
      i18n.addMessages({
        locale: 'ru',
        foo: 'bar',
      });
      i18n.addMessages({
        locale: 'en',
        bar: 'foo',
      });

      i18n.setLocale('ru');
      expect(i18n.getMessages()).toEqual({
        locale: 'ru',
        foo: 'bar',
      });

      i18n.setLocale('en');
      expect(i18n.getMessages()).toEqual({
        locale: 'en',
        bar: 'foo',
      });
    });

    test('should return an empty object if messages for current locale are not specified', () => {
      expect(i18n.getMessages()).toEqual({});

      i18n.setLocale('fr');
      expect(i18n.getMessages()).toEqual({});

      i18n.setLocale('en');
      expect(i18n.getMessages()).toEqual({});
    });
  });

  describe('setLocale', () => {
    test('should throw error if locale is not a non-empty string', () => {
      expect(() => i18n.setLocale(undefined)).toThrow();
      expect(() => i18n.setLocale(null)).toThrow();
      expect(() => i18n.setLocale(true)).toThrow();
      expect(() => i18n.setLocale(5)).toThrow();
      expect(() => i18n.setLocale({})).toThrow();
      expect(() => i18n.setLocale('')).toThrow();
    });

    test('should update current locale', () => {
      expect(i18n.getLocale()).not.toBe('foo');
      i18n.setLocale('foo');
      expect(i18n.getLocale()).toBe('foo');
    });

    test('should normalize passed locale', () => {
      i18n.setLocale('en_US');
      expect(i18n.getLocale()).toBe('en-us');
    });
  });

  describe('getLocale', () => {
    test('should return "en" locale by default', () => {
      expect(i18n.getLocale()).toBe('en');
    });

    test('should return updated locale', () => {
      i18n.setLocale('foo');
      expect(i18n.getLocale()).toBe('foo');
    });
  });

  describe('setDefaultLocale', () => {
    test('should throw error if locale is not a non-empty string', () => {
      expect(() => i18n.setDefaultLocale(undefined)).toThrow();
      expect(() => i18n.setDefaultLocale(null)).toThrow();
      expect(() => i18n.setDefaultLocale(true)).toThrow();
      expect(() => i18n.setDefaultLocale(5)).toThrow();
      expect(() => i18n.setDefaultLocale({})).toThrow();
      expect(() => i18n.setDefaultLocale('')).toThrow();
    });

    test('should update the default locale', () => {
      expect(i18n.getDefaultLocale()).not.toBe('foo');
      i18n.setDefaultLocale('foo');
      expect(i18n.getDefaultLocale()).toBe('foo');
    });

    test('should normalize passed locale', () => {
      i18n.setDefaultLocale('en_US');
      expect(i18n.getDefaultLocale()).toBe('en-us');
    });

    test('should set "en" locale as default for IntlMessageFormat and IntlRelativeFormat', () => {
      const IntlMessageFormat = require('intl-messageformat');
      const IntlRelativeFormat = require('intl-relativeformat');

      expect(IntlMessageFormat.defaultLocale).toBe('en');
      expect(IntlRelativeFormat.defaultLocale).toBe('en');
    });

    test('should update defaultLocale for IntlMessageFormat and IntlRelativeFormat', () => {
      const IntlMessageFormat = require('intl-messageformat');
      const IntlRelativeFormat = require('intl-relativeformat');

      i18n.setDefaultLocale('foo');

      expect(IntlMessageFormat.defaultLocale).toBe('foo');
      expect(IntlRelativeFormat.defaultLocale).toBe('foo');
    });
  });

  describe('getDefaultLocale', () => {
    test('should return "en" locale by default', () => {
      expect(i18n.getDefaultLocale()).toBe('en');
    });

    test('should return updated locale', () => {
      i18n.setDefaultLocale('foo');
      expect(i18n.getDefaultLocale()).toBe('foo');
    });
  });

  describe('setFormats', () => {
    test('should throw error if formats parameter is not a non-empty object', () => {
      expect(() => i18n.setFormats(undefined)).toThrow();
      expect(() => i18n.setFormats(null)).toThrow();
      expect(() => i18n.setFormats(true)).toThrow();
      expect(() => i18n.setFormats(5)).toThrow();
      expect(() => i18n.setFormats('foo')).toThrow();
      expect(() => i18n.setFormats({})).toThrow();
    });

    test('should merge current formats with a passed formats', () => {
      expect(i18n.getFormats().date.short).not.toEqual({
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      i18n.setFormats({
        date: {
          short: {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          },
        },
      });

      expect(i18n.getFormats().date.short).toEqual({
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      i18n.setFormats({
        date: {
          short: {
            month: 'long',
          },
        },
      });

      expect(i18n.getFormats().date.short).toEqual({
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    });
  });

  describe('getFormats', () => {
    test('should return "en" formats by default', () => {
      const { formats } = require('./formats');

      expect(i18n.getFormats()).toEqual(formats);
    });

    test('should return updated formats', () => {
      const { formats } = require('./formats');

      i18n.setFormats({
        foo: 'bar',
      });

      expect(i18n.getFormats()).toEqual({
        ...formats,
        foo: 'bar',
      });
    });
  });

  describe('getRegisteredLocales', () => {
    test('should return empty array by default', () => {
      expect(i18n.getRegisteredLocales()).toEqual([]);
    });

    test('should return array of registered locales', () => {
      i18n.addMessages({
        locale: 'en',
      });

      expect(i18n.getRegisteredLocales()).toEqual(['en']);

      i18n.addMessages({
        locale: 'ru',
      });

      expect(i18n.getRegisteredLocales()).toContain('en', 'ru');
      expect(i18n.getRegisteredLocales().length).toBe(2);

      i18n.addMessages({
        locale: 'fr',
      });

      expect(i18n.getRegisteredLocales()).toContain('en', 'ru', 'fr');
      expect(i18n.getRegisteredLocales().length).toBe(3);
    });
  });

  describe('translate', () => {
    test('should throw error if id is not a non-empty string', () => {
      expect(() => i18n.translate(undefined)).toThrowErrorMatchingSnapshot();
      expect(() => i18n.translate(null)).toThrowErrorMatchingSnapshot();
      expect(() => i18n.translate(true)).toThrowErrorMatchingSnapshot();
      expect(() => i18n.translate(5)).toThrowErrorMatchingSnapshot();
      expect(() => i18n.translate({})).toThrowErrorMatchingSnapshot();
      expect(() => i18n.translate('')).toThrowErrorMatchingSnapshot();
    });

    test('should throw error if translation message and defaultMessage are not provided', () => {
      expect(() => i18n.translate('foo')).toThrowErrorMatchingSnapshot();
    });

    test('should return message as is if values are not provided', () => {
      i18n.init({
        locale: 'en',
        ['a.b.c']: 'foo',
      });

      expect(i18n.translate('a.b.c')).toBe('foo');
    });

    test('should return default message as is if values are not provided', () => {
      expect(i18n.translate('a.b.c', { defaultMessage: 'foo' })).toBe('foo');
    });

    test('should not return defaultMessage as is if values are provided', () => {
      i18n.init({
        locale: 'en',
        ['a.b.c']: 'foo',
      });
      expect(i18n.translate('a.b.c', { defaultMessage: 'bar' })).toBe('foo');
    });

    test('should interpolate variables', () => {
      i18n.init({
        locale: 'en',
        ['a.b.c']: 'foo {a}, {b}, {c} bar',
        ['d.e.f']: '{foo}',
      });

      expect(
        i18n.translate('a.b.c', {
          values: { a: 1, b: 2, c: 3 },
        })
      ).toBe('foo 1, 2, 3 bar');

      expect(i18n.translate('d.e.f', { values: { foo: 'bar' } })).toBe('bar');
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
        ['a.b.c']: `You have {numPhotos, plural,
                      =0 {no photos.}
                      =1 {one photo.}
                      other {# photos.}
                   }`,
      });

      expect(i18n.translate('a.b.c', { values: { numPhotos: 0 } })).toBe('You have no photos.');
      expect(i18n.translate('a.b.c', { values: { numPhotos: 1 } })).toBe('You have one photo.');
      expect(i18n.translate('a.b.c', { values: { numPhotos: 1000 } })).toBe(
        'You have 1,000 photos.'
      );
    });

    test('should format pluralized default messages', () => {
      i18n.setDefaultLocale('en');

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
        ['a.b.c']: `You have {numPhotos, plural,
                      =0 {no photos.}
                      =1 {one photo.}
                      other {# photos.}
                   }`,
      });
      i18n.setDefaultLocale('en');

      expect(() => i18n.translate('a.b.c', { values: { foo: 0 } })).toThrowErrorMatchingSnapshot();

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
        ['a.b.c']: 'Result: {result, number, percent}',
      });
      i18n.setDefaultLocale('en');

      expect(i18n.translate('a.b.c', { values: { result: 0.15 } })).toBe('Result: 15%');

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
        ['a.short']: 'Sale begins {start, date, short}',
        ['a.medium']: 'Sale begins {start, date, medium}',
        ['a.long']: 'Sale begins {start, date, long}',
        ['a.full']: 'Sale begins {start, date, full}',
      });

      expect(
        i18n.translate('a.short', {
          values: { start: new Date(2018, 5, 20) },
        })
      ).toBe('Sale begins 6/20/18');

      expect(
        i18n.translate('a.medium', {
          values: { start: new Date(2018, 5, 20) },
        })
      ).toBe('Sale begins Jun 20, 2018');

      expect(
        i18n.translate('a.long', {
          values: { start: new Date(2018, 5, 20) },
        })
      ).toBe('Sale begins June 20, 2018');

      expect(
        i18n.translate('a.full', {
          values: { start: new Date(2018, 5, 20) },
        })
      ).toBe('Sale begins Wednesday, June 20, 2018');
    });

    test('should format default messages with date formatter', () => {
      i18n.setDefaultLocale('en');

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
        ['a.short']: 'Coupon expires at {expires, time, short}',
        ['a.medium']: 'Coupon expires at {expires, time, medium}',
      });

      expect(
        i18n.translate('a.short', {
          values: { expires: new Date(2018, 5, 20, 18, 40, 30, 50) },
        })
      ).toBe('Coupon expires at 6:40 PM');

      expect(
        i18n.translate('a.medium', {
          values: { expires: new Date(2018, 5, 20, 18, 40, 30, 50) },
        })
      ).toBe('Coupon expires at 6:40:30 PM');
    });

    test('should format default messages with time formatter', () => {
      i18n.setDefaultLocale('en');

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

    test('should format message with a custom format', () => {
      i18n.init({
        locale: 'en',
        formats: {
          number: {
            usd: { style: 'currency', currency: 'USD' },
          },
        },
        ['a.b.c']: 'Your total is {total, number, usd}',
        ['d.e.f']: 'Your total is {total, number, eur}',
      });

      expect(i18n.translate('a.b.c', { values: { total: 1000 } })).toBe('Your total is $1,000.00');

      i18n.setFormats({
        number: {
          eur: { style: 'currency', currency: 'EUR' },
        },
      });

      expect(i18n.translate('a.b.c', { values: { total: 1000 } })).toBe('Your total is $1,000.00');

      expect(i18n.translate('d.e.f', { values: { total: 1000 } })).toBe('Your total is €1,000.00');
    });

    test('should format default message with a custom format', () => {
      i18n.init({
        locale: 'en',
        formats: {
          number: {
            usd: { style: 'currency', currency: 'USD' },
          },
        },
      });
      i18n.setDefaultLocale('en');

      expect(
        i18n.translate('a.b.c', {
          values: { total: 1000 },
          defaultMessage: 'Your total is {total, number, usd}',
        })
      ).toBe('Your total is $1,000.00');

      i18n.setFormats({
        number: {
          eur: { style: 'currency', currency: 'EUR' },
        },
      });

      expect(
        i18n.translate('a.b.c', {
          values: { total: 1000 },
          defaultMessage: 'Your total is {total, number, usd}',
        })
      ).toBe('Your total is $1,000.00');

      expect(
        i18n.translate('d.e.f', {
          values: { total: 1000 },
          defaultMessage: 'Your total is {total, number, eur}',
        })
      ).toBe('Your total is €1,000.00');
    });

    test('should use default format if passed format option is not specified', () => {
      i18n.init({
        locale: 'en',
        ['a.b.c']: 'Your total is {total, number, usd}',
      });
      i18n.setDefaultLocale('en');

      expect(i18n.translate('a.b.c', { values: { total: 1000 } })).toBe('Your total is 1,000');

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
        ['a.b.c']: 'Your total is {total, foo}',
      });
      i18n.setDefaultLocale('en');

      expect(() =>
        i18n.translate('a.b.c', { values: { total: 1 } })
      ).toThrowErrorMatchingSnapshot();

      expect(() =>
        i18n.translate('d.e.f', {
          values: { total: 1000 },
          defaultMessage: 'Your total is {total, bar}',
        })
      ).toThrowErrorMatchingSnapshot();
    });
  });

  describe('init', () => {
    test('should not initialize the engine if messages are not specified', () => {
      i18n.init();
      expect(i18n.getMessages()).toEqual({});
    });

    test('should throw error if messages are empty', () => {
      expect(() => i18n.init({})).toThrow();
      expect(i18n.getMessages()).toEqual({});
    });

    test('should add messages if locale is specified', () => {
      i18n.init({
        locale: 'en',
        foo: 'bar',
      });

      expect(i18n.getMessages()).toEqual({
        locale: 'en',
        foo: 'bar',
      });
    });

    test('should set the current locale', () => {
      i18n.init({ locale: 'ru' });
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
      });

      expect(i18n.getFormats().date.custom).toEqual({
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    });
  });
});
