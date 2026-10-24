/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createIntl } from '@formatjs/intl';
import { activateTranslation, translate } from './i18n';

describe('plain default messages', () => {
  beforeEach(() => {
    activateTranslation({ locale: 'en', messages: {} });
  });

  test('returns plain English text with or without values', () => {
    expect(translate('plain', { defaultMessage: 'Hello, 🌍! 50% — café.\nNext line' })).toBe(
      'Hello, 🌍! 50% — café.\nNext line'
    );
    expect(
      translate('plain.withValues', {
        defaultMessage: 'Plain text #1',
        values: { unused: 'ignored' },
      })
    ).toBe('Plain text #1');
  });

  test('uses translated messages and respects locale changes', () => {
    activateTranslation({ locale: 'en', messages: { plain: 'English override' } });
    expect(translate('plain', { defaultMessage: 'English default' })).toBe('English override');

    activateTranslation({ locale: 'fr', messages: { plain: 'Traduction française' } });
    expect(translate('plain', { defaultMessage: 'English default' })).toBe('Traduction française');
    expect(translate('missing', { defaultMessage: 'English fallback' })).toBe('English fallback');

    activateTranslation({ locale: 'en', messages: {} });
    expect(translate('plain', { defaultMessage: 'English default' })).toBe('English default');
  });

  test.each([undefined, null])('handles an absent message map (%s)', (messages) => {
    const translation = { locale: 'en', messages: {} };
    Reflect.set(translation, 'messages', messages);
    activateTranslation(translation);

    expect(translate('plain', { defaultMessage: 'English default' })).toBe('English default');
  });

  test.each([
    ['quoted brace', "A '{' brace", 'A { brace'],
    ['escaped apostrophe', "It''s ready", "It's ready"],
    ['placeholder', 'Hello {name}', 'Hello Ada'],
    ['plural', '{count, plural, one {one item} other {# items}}', '2 items'],
    ['rich tag', '<bold>Ready</bold>', 'Ready'],
  ])('formats %s through FormatJS', (_name, defaultMessage, expected) => {
    const values = {
      name: 'Ada',
      count: 2,
      bold: (chunks: string[]) => chunks.join(''),
    };
    expect(translate('formatted', { defaultMessage, values })).toBe(expected);
  });

  test('keeps validation, fallback, and custom formatter behavior', () => {
    const { getDateTimeFormat, getPluralRules } = createIntl({ locale: 'en' }).formatters;
    expect(() => translate('', { defaultMessage: 'Plain text' })).toThrow(
      '[I18n] An `id` must be a non-empty string to translate a message.'
    );
    expect(() => translate('missing.default', { defaultMessage: '' })).toThrow(
      'Missing `defaultMessage`.'
    );
    expect(translate('invalid.icu', { defaultMessage: 'Broken {' })).toBe('Broken {');
    expect(
      translate('literal.tags', { defaultMessage: '<bold>Ready</bold>', ignoreTag: true })
    ).toBe('<bold>Ready</bold>');
    expect(
      translate('number', {
        defaultMessage: '{count, number}',
        values: { count: 1234 },
        formatters: {
          getNumberFormat: () => new Intl.NumberFormat('en', { useGrouping: false }),
          getDateTimeFormat,
          getPluralRules,
        },
      })
    ).toBe('1234');
  });

  test('falls back to a plain default when a translated message is malformed', () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    activateTranslation({ locale: 'en', messages: { broken: 'Broken {' } });

    expect(translate('broken', { defaultMessage: 'Safe default' })).toBe('Safe default');
    expect(error).toHaveBeenCalled();

    error.mockRestore();
  });
});
