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
import { TEXT_CONTEXT_TYPE } from '../content_types';
import { expectReactElementWithNull, expectReactElementWithBlank } from '../test_utils';

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
      expect(formatter.convert('', TEXT_CONTEXT_TYPE)).toBe('Empty String Mapped');
      expect(formatter.reactConvert('')).toBe('Empty String Mapped');
    });

    test('null stays null and shows null label', () => {
      expect(formatter.convert(null, TEXT_CONTEXT_TYPE)).toBe(NULL_LABEL);
      expectReactElementWithNull(formatter.reactConvert(null));
    });

    test('undefined stays undefined and shows null label', () => {
      expect(formatter.convert(undefined, TEXT_CONTEXT_TYPE)).toBe(NULL_LABEL);
      expectReactElementWithNull(formatter.reactConvert(undefined));
    });

    test('maps known key to configured value', () => {
      expect(formatter.convert('test', TEXT_CONTEXT_TYPE)).toBe('Test Value');
      expect(formatter.reactConvert('test')).toBe('Test Value');
    });

    test('maps unknown key to unknownKeyValue', () => {
      expect(formatter.convert('unknown', TEXT_CONTEXT_TYPE)).toBe('Custom Unknown');
      expect(formatter.reactConvert('unknown')).toBe('Custom Unknown');
    });

    test('falls back to original value when no unknownKeyValue is set', () => {
      const formatterWithoutUnknown = new StaticLookupFormat({
        lookupEntries: [{ key: 'test', value: 'Test Value' }],
        unknownKeyValue: null,
      });
      expect(formatterWithoutUnknown.convert('unknown', TEXT_CONTEXT_TYPE)).toBe('unknown');
      expect(formatterWithoutUnknown.reactConvert('unknown')).toBe('unknown');
    });

    test('falls back to null label for null/undefined when no unknownKeyValue is set', () => {
      const formatterWithoutUnknown = new StaticLookupFormat({
        lookupEntries: [{ key: 'test', value: 'Test Value' }],
        unknownKeyValue: null,
      });
      expect(formatterWithoutUnknown.convert(null, TEXT_CONTEXT_TYPE)).toBe(NULL_LABEL);
      expect(formatterWithoutUnknown.convert(undefined, TEXT_CONTEXT_TYPE)).toBe(NULL_LABEL);
      expectReactElementWithNull(formatterWithoutUnknown.reactConvert(null));
      expectReactElementWithNull(formatterWithoutUnknown.reactConvert(undefined));
    });

    test('falls back to unknownKeyValue for an empty string when no mapping exists', () => {
      const formatterWithUnknown = new StaticLookupFormat({
        lookupEntries: [{ key: 'test', value: 'Test Value' }],
        unknownKeyValue: 'Unknown',
      });
      expect(formatterWithUnknown.convert('', TEXT_CONTEXT_TYPE)).toBe('Unknown');
      expect(formatterWithUnknown.reactConvert('')).toBe('Unknown');
    });

    test('falls back to empty label for an empty string when no unknownKeyValue is set', () => {
      const formatterWithoutUnknown = new StaticLookupFormat({
        lookupEntries: [{ key: 'test', value: 'Test Value' }],
        unknownKeyValue: null,
      });
      expect(formatterWithoutUnknown.convert('', TEXT_CONTEXT_TYPE)).toBe(EMPTY_LABEL);
      expectReactElementWithBlank(formatterWithoutUnknown.reactConvert(''));
    });

    test('mapped values with HTML-like content are returned as plain text', () => {
      expect(formatter.convert('html', TEXT_CONTEXT_TYPE)).toBe('<script>alert("test")</script>');
      expect(formatter.reactConvert('html')).toBe('<script>alert("test")</script>');
    });

    test('preserves highlight functionality via reactConvert', () => {
      const options = {
        field: { name: 'test_field' },
        hit: {
          highlight: {
            test_field: ['@kibana-highlighted-field@Test@/kibana-highlighted-field@ Value'],
          },
        },
      };
      expect(formatter.reactConvert('test', options)).toMatchInlineSnapshot(`
        <React.Fragment>
          <mark
            className="ffSearch__highlight"
          >
            Test
          </mark>
           Value
        </React.Fragment>
      `);
    });

    test('falls back to missing value handling when lookup yields missing originals', () => {
      const formatterWithoutCustomMapping = new StaticLookupFormat({
        lookupEntries: [{ key: 'test', value: 'Test Value' }],
        unknownKeyValue: null,
      });

      expect(formatterWithoutCustomMapping.convert('', TEXT_CONTEXT_TYPE)).toBe(EMPTY_LABEL);
      expectReactElementWithBlank(formatterWithoutCustomMapping.reactConvert(''));

      expect(formatterWithoutCustomMapping.convert(null, TEXT_CONTEXT_TYPE)).toBe(NULL_LABEL);
      expectReactElementWithNull(formatterWithoutCustomMapping.reactConvert(null));

      expect(formatterWithoutCustomMapping.convert(undefined, TEXT_CONTEXT_TYPE)).toBe(NULL_LABEL);
      expectReactElementWithNull(formatterWithoutCustomMapping.reactConvert(undefined));

      expect(formatterWithoutCustomMapping.convert('unknown', TEXT_CONTEXT_TYPE)).toBe('unknown');
      expect(formatterWithoutCustomMapping.reactConvert('unknown')).toBe('unknown');
    });
  });

  describe('falsy mapped values', () => {
    test('correctly maps to empty string value (does not fall back to unknownKeyValue)', () => {
      const formatterWithEmptyStringValue = new StaticLookupFormat({
        lookupEntries: [{ key: 'empty', value: '' }],
        unknownKeyValue: 'Should Not Use',
      });
      expect(formatterWithEmptyStringValue.convert('empty', TEXT_CONTEXT_TYPE)).toBe('');
      expect(formatterWithEmptyStringValue.reactConvert('empty')).toBe('');
    });

    test('skips entry with empty key and empty value, falls back to unknownKeyValue', () => {
      const formatterWithEmptyKeyAndValue = new StaticLookupFormat({
        lookupEntries: [{ key: '', value: '' }],
        unknownKeyValue: 'Unknown',
      });
      expect(formatterWithEmptyKeyAndValue.convert('', TEXT_CONTEXT_TYPE)).toBe('Unknown');
      expect(formatterWithEmptyKeyAndValue.reactConvert('')).toBe('Unknown');
    });

    test('skips entry with undefined key and empty value, falls back to missing value label', () => {
      const formatterWithUndefinedKeyEmptyValue = new StaticLookupFormat({
        lookupEntries: [{ key: undefined, value: '' }],
        unknownKeyValue: null,
      });
      expect(formatterWithUndefinedKeyEmptyValue.convert('', TEXT_CONTEXT_TYPE)).toBe(EMPTY_LABEL);
      expectReactElementWithBlank(formatterWithUndefinedKeyEmptyValue.reactConvert(''));
    });

    test('correctly maps to 0 value (does not fall back to unknownKeyValue)', () => {
      const formatterWithZeroValue = new StaticLookupFormat({
        lookupEntries: [{ key: 'zero', value: 0 }],
        unknownKeyValue: 'Should Not Use',
      });
      expect(formatterWithZeroValue.convert('zero', TEXT_CONTEXT_TYPE)).toBe('0');
      expect(formatterWithZeroValue.reactConvert('zero')).toBe('0');
    });

    test('correctly maps to false value (does not fall back to unknownKeyValue)', () => {
      const formatterWithFalseValue = new StaticLookupFormat({
        lookupEntries: [{ key: 'falsy', value: false }],
        unknownKeyValue: 'Should Not Use',
      });
      expect(formatterWithFalseValue.convert('falsy', TEXT_CONTEXT_TYPE)).toBe('false');
      expect(formatterWithFalseValue.reactConvert('falsy')).toBe('false');
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
      expect(formatter.convert(1, TEXT_CONTEXT_TYPE)).toBe('Yes');
      expect(formatter.reactConvert(1)).toBe('Yes');
    });

    test('maps boolean false (0) to "false" key value', () => {
      expect(formatter.convert(0, TEXT_CONTEXT_TYPE)).toBe('No');
      expect(formatter.reactConvert(0)).toBe('No');
    });

    test('maps string "true" to configured value', () => {
      expect(formatter.convert('true', TEXT_CONTEXT_TYPE)).toBe('Yes');
      expect(formatter.reactConvert('true')).toBe('Yes');
    });

    test('maps string "false" to configured value', () => {
      expect(formatter.convert('false', TEXT_CONTEXT_TYPE)).toBe('No');
      expect(formatter.reactConvert('false')).toBe('No');
    });
  });

  describe('edge cases', () => {
    test('handles empty lookupEntries array', () => {
      const emptyFormatter = new StaticLookupFormat({
        lookupEntries: [],
        unknownKeyValue: 'Default',
      });
      expect(emptyFormatter.convert('anything', TEXT_CONTEXT_TYPE)).toBe('Default');
      expect(emptyFormatter.reactConvert('anything')).toBe('Default');
    });

    test('handles lookupEntries with empty objects', () => {
      const formatterWithEmptyEntries = new StaticLookupFormat({
        lookupEntries: [{}],
        unknownKeyValue: 'Default',
      });
      expect(formatterWithEmptyEntries.convert('test', TEXT_CONTEXT_TYPE)).toBe('Default');
      expect(formatterWithEmptyEntries.reactConvert('test')).toBe('Default');
    });

    test('treats undefined key as empty string key when value is provided', () => {
      // This simulates the case where the user adds a lookup entry
      // but doesn't explicitly set the key (leaving it undefined)
      const formatterWithUndefinedKey = new StaticLookupFormat({
        lookupEntries: [{ key: undefined, value: 'Empty String Mapped' }],
        unknownKeyValue: null,
      });
      // Empty string should map to the value with undefined key
      expect(formatterWithUndefinedKey.convert('', TEXT_CONTEXT_TYPE)).toBe('Empty String Mapped');
      expect(formatterWithUndefinedKey.reactConvert('')).toBe('Empty String Mapped');
    });

    test('treats null key as empty string key when value is provided', () => {
      const formatterWithNullKey = new StaticLookupFormat({
        lookupEntries: [{ key: null, value: 'Empty String Mapped' }],
        unknownKeyValue: null,
      });
      expect(formatterWithNullKey.convert('', TEXT_CONTEXT_TYPE)).toBe('Empty String Mapped');
      expect(formatterWithNullKey.reactConvert('')).toBe('Empty String Mapped');
    });

    test('does not treat undefined key as empty string key when value is not provided', () => {
      const formatterWithEmptyEntry = new StaticLookupFormat({
        lookupEntries: [{ key: undefined, value: undefined }],
        unknownKeyValue: 'Unknown',
      });
      // Empty string should not be mapped, should fall back to unknownKeyValue
      expect(formatterWithEmptyEntry.convert('', TEXT_CONTEXT_TYPE)).toBe('Unknown');
      expect(formatterWithEmptyEntry.reactConvert('')).toBe('Unknown');
    });
  });
});
