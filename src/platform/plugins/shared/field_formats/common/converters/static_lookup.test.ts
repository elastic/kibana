/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { NULL_LABEL, EMPTY_LABEL } from '@kbn/field-formats-common';
import { StaticLookupFormat } from './static_lookup';

describe('StaticLookupFormat', () => {
  let formatter: StaticLookupFormat;

  beforeEach(() => {
    formatter = new StaticLookupFormat({
      lookupEntries: [
        { key: '', value: 'Empty String Mapped' },
        { key: 'test', value: 'Test Value' },
        { key: 'html', value: '<script>alert("test")</script>' },
      ],
      unknownKeyValue: 'Custom Unknown',
    });
  });

  describe('textConvert', () => {
    test('maps empty string to configured value', () => {
      expect(formatter.convert('', 'text')).toBe('Empty String Mapped');
    });

    test('null stays null and shows null label', () => {
      expect(formatter.convert(null, 'text')).toBe(NULL_LABEL);
    });

    test('undefined stays undefined and shows null label', () => {
      expect(formatter.convert(undefined, 'text')).toBe(NULL_LABEL);
    });

    test('maps known key to configured value', () => {
      expect(formatter.convert('test', 'text')).toBe('Test Value');
    });

    test('maps unknown key to unknownKeyValue', () => {
      expect(formatter.convert('unknown', 'text')).toBe('Custom Unknown');
    });

    test('falls back to original value when no unknownKeyValue is set', () => {
      const formatterWithoutUnknown = new StaticLookupFormat({
        lookupEntries: [{ key: 'test', value: 'Test Value' }],
        unknownKeyValue: null,
      });
      expect(formatterWithoutUnknown.convert('unknown', 'text')).toBe('unknown');
    });

    test('falls back to null label for null/undefined when no unknownKeyValue is set', () => {
      const formatterWithoutUnknown = new StaticLookupFormat({
        lookupEntries: [{ key: 'test', value: 'Test Value' }],
        unknownKeyValue: null,
      });
      expect(formatterWithoutUnknown.convert(null, 'text')).toBe(NULL_LABEL);
      expect(formatterWithoutUnknown.convert(undefined, 'text')).toBe(NULL_LABEL);
    });

    test('falls back to unknownKeyValue for an empty string when no mapping exists', () => {
      const formatterWithUnknown = new StaticLookupFormat({
        lookupEntries: [{ key: 'test', value: 'Test Value' }],
        unknownKeyValue: 'Unknown',
      });
      expect(formatterWithUnknown.convert('', 'text')).toBe('Unknown');
    });

    test('falls back to empty label for an empty string when no unknownKeyValue is set', () => {
      const formatterWithoutUnknown = new StaticLookupFormat({
        lookupEntries: [{ key: 'test', value: 'Test Value' }],
        unknownKeyValue: null,
      });
      expect(formatterWithoutUnknown.convert('', 'text')).toBe(EMPTY_LABEL);
    });
  });

  describe('falsy mapped values', () => {
    test('correctly maps to empty string value (does not fall back to unknownKeyValue)', () => {
      const formatterWithEmptyStringValue = new StaticLookupFormat({
        lookupEntries: [{ key: 'empty', value: '' }],
        unknownKeyValue: 'Should Not Use',
      });
      expect(formatterWithEmptyStringValue.convert('empty', 'text')).toBe('');
      expect(formatterWithEmptyStringValue.convert('empty', 'html')).toBe('');
    });

    test('skips entry with empty key and empty value, falls back to unknownKeyValue', () => {
      const formatterWithEmptyKeyAndValue = new StaticLookupFormat({
        lookupEntries: [{ key: '', value: '' }],
        unknownKeyValue: 'Unknown',
      });
      expect(formatterWithEmptyKeyAndValue.convert('', 'text')).toBe('Unknown');
      expect(formatterWithEmptyKeyAndValue.convert('', 'html')).toBe('Unknown');
    });

    test('skips entry with undefined key and empty value, falls back to missing value label', () => {
      const formatterWithUndefinedKeyEmptyValue = new StaticLookupFormat({
        lookupEntries: [{ key: undefined, value: '' }],
        unknownKeyValue: null,
      });
      expect(formatterWithUndefinedKeyEmptyValue.convert('', 'text')).toBe(EMPTY_LABEL);
      expect(formatterWithUndefinedKeyEmptyValue.convert('', 'html')).toBe(
        '<span class="ffString__emptyValue">(blank)</span>'
      );
    });

    test('correctly maps to 0 value (does not fall back to unknownKeyValue)', () => {
      const formatterWithZeroValue = new StaticLookupFormat({
        lookupEntries: [{ key: 'zero', value: 0 }],
        unknownKeyValue: 'Should Not Use',
      });
      expect(formatterWithZeroValue.convert('zero', 'text')).toBe('0');
      expect(formatterWithZeroValue.convert('zero', 'html')).toBe('0');
    });

    test('correctly maps to false value (does not fall back to unknownKeyValue)', () => {
      const formatterWithFalseValue = new StaticLookupFormat({
        lookupEntries: [{ key: 'falsy', value: false }],
        unknownKeyValue: 'Should Not Use',
      });
      expect(formatterWithFalseValue.convert('falsy', 'text')).toBe('false');
      expect(formatterWithFalseValue.convert('falsy', 'html')).toBe('false');
    });
  });

  describe('htmlConvert', () => {
    test('maps empty string to configured value and escapes HTML', () => {
      expect(formatter.convert('', 'html')).toBe('Empty String Mapped');
    });

    test('null stays null and shows null label HTML', () => {
      expect(formatter.convert(null, 'html')).toBe(
        '<span class="ffString__emptyValue">(null)</span>'
      );
    });

    test('undefined stays undefined and shows null label HTML', () => {
      expect(formatter.convert(undefined, 'html')).toBe(
        '<span class="ffString__emptyValue">(null)</span>'
      );
    });

    test('maps known key to configured value and escapes HTML', () => {
      expect(formatter.convert('test', 'html')).toBe('Test Value');
    });

    test('maps unknown key to unknownKeyValue and escapes HTML', () => {
      expect(formatter.convert('unknown', 'html')).toBe('Custom Unknown');
    });

    test('escapes HTML in mapped values', () => {
      expect(formatter.convert('html', 'html')).toBe(
        '&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;'
      );
    });

    test('preserves highlight functionality', () => {
      const options = {
        field: { name: 'test_field' },
        hit: {
          highlight: {
            test_field: ['@kibana-highlighted-field@Test@/kibana-highlighted-field@ Value'],
          },
        },
      };
      // The highlight should replace the formatted text with the highlighted version
      expect(formatter.convert('test', 'html', options)).toBe(
        '<mark class="ffSearch__highlight">Test</mark> Value'
      );
    });

    test('falls back to missing value handling when textConvert returns original null/empty values', () => {
      const formatterWithoutCustomMapping = new StaticLookupFormat({
        lookupEntries: [{ key: 'test', value: 'Test Value' }],
        unknownKeyValue: null, // No custom unknown value
      });

      // Empty string should show (blank) since textConvert returns the original empty string
      expect(formatterWithoutCustomMapping.convert('', 'html')).toBe(
        '<span class="ffString__emptyValue">(blank)</span>'
      );

      // Null should show (null) since textConvert returns the original null
      expect(formatterWithoutCustomMapping.convert(null, 'html')).toBe(
        '<span class="ffString__emptyValue">(null)</span>'
      );

      // Undefined should show (null) since textConvert returns the original undefined
      expect(formatterWithoutCustomMapping.convert(undefined, 'html')).toBe(
        '<span class="ffString__emptyValue">(null)</span>'
      );

      // Unknown value should fall back to original value since unknownKeyValue is null
      expect(formatterWithoutCustomMapping.convert('unknown', 'html')).toBe('unknown');
    });
  });

  describe('boolean key translations', () => {
    beforeEach(() => {
      formatter = new StaticLookupFormat({
        lookupEntries: [
          { key: 'true', value: 'Yes' },
          { key: 'false', value: 'No' },
        ],
        unknownKeyValue: 'Unknown',
      });
    });

    test('maps boolean true (1) to "true" key value', () => {
      expect(formatter.convert(1, 'text')).toBe('Yes');
      expect(formatter.convert(1, 'html')).toBe('Yes');
    });

    test('maps boolean false (0) to "false" key value', () => {
      expect(formatter.convert(0, 'text')).toBe('No');
      expect(formatter.convert(0, 'html')).toBe('No');
    });

    test('maps string "true" to configured value', () => {
      expect(formatter.convert('true', 'text')).toBe('Yes');
      expect(formatter.convert('true', 'html')).toBe('Yes');
    });

    test('maps string "false" to configured value', () => {
      expect(formatter.convert('false', 'text')).toBe('No');
      expect(formatter.convert('false', 'html')).toBe('No');
    });
  });

  describe('edge cases', () => {
    test('handles empty lookupEntries array', () => {
      const emptyFormatter = new StaticLookupFormat({
        lookupEntries: [],
        unknownKeyValue: 'Default',
      });
      expect(emptyFormatter.convert('anything', 'text')).toBe('Default');
      expect(emptyFormatter.convert('anything', 'html')).toBe('Default');
    });

    test('handles lookupEntries with empty objects', () => {
      const formatterWithEmptyEntries = new StaticLookupFormat({
        lookupEntries: [{}],
        unknownKeyValue: 'Default',
      });
      expect(formatterWithEmptyEntries.convert('test', 'text')).toBe('Default');
      expect(formatterWithEmptyEntries.convert('test', 'html')).toBe('Default');
    });

    test('treats undefined key as empty string key when value is provided', () => {
      // This simulates the case where the user adds a lookup entry
      // but doesn't explicitly set the key (leaving it undefined)
      const formatterWithUndefinedKey = new StaticLookupFormat({
        lookupEntries: [{ key: undefined, value: 'Empty String Mapped' }],
        unknownKeyValue: null,
      });
      // Empty string should map to the value with undefined key
      expect(formatterWithUndefinedKey.convert('', 'text')).toBe('Empty String Mapped');
      expect(formatterWithUndefinedKey.convert('', 'html')).toBe('Empty String Mapped');
    });

    test('treats null key as empty string key when value is provided', () => {
      const formatterWithNullKey = new StaticLookupFormat({
        lookupEntries: [{ key: null, value: 'Empty String Mapped' }],
        unknownKeyValue: null,
      });
      expect(formatterWithNullKey.convert('', 'text')).toBe('Empty String Mapped');
      expect(formatterWithNullKey.convert('', 'html')).toBe('Empty String Mapped');
    });

    test('does not treat undefined key as empty string key when value is not provided', () => {
      const formatterWithEmptyEntry = new StaticLookupFormat({
        lookupEntries: [{ key: undefined, value: undefined }],
        unknownKeyValue: 'Unknown',
      });
      // Empty string should not be mapped, should fall back to unknownKeyValue
      expect(formatterWithEmptyEntry.convert('', 'text')).toBe('Unknown');
      expect(formatterWithEmptyEntry.convert('', 'html')).toBe('Unknown');
    });
  });
});
