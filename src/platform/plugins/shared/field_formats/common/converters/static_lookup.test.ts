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
      expect(formatter.convertToText('')).toBe('Empty String Mapped');
      expect(formatter.convertToReact('')).toBe('Empty String Mapped');
    });

    test('null stays null and shows null label', () => {
      expect(formatter.convertToText(null)).toBe(NULL_LABEL);
      expectReactElementWithNull(formatter.convertToReact(null));
    });

    test('undefined stays undefined and shows null label', () => {
      expect(formatter.convertToText(undefined)).toBe(NULL_LABEL);
      expectReactElementWithNull(formatter.convertToReact(undefined));
    });

    test('maps known key to configured value', () => {
      expect(formatter.convertToText('test')).toBe('Test Value');
      expect(formatter.convertToReact('test')).toBe('Test Value');
    });

    test('maps unknown key to unknownKeyValue', () => {
      expect(formatter.convertToText('unknown')).toBe('Custom Unknown');
      expect(formatter.convertToReact('unknown')).toBe('Custom Unknown');
    });

    test('falls back to original value when no unknownKeyValue is set', () => {
      const formatterWithoutUnknown = new StaticLookupFormat({
        lookupEntries: [{ key: 'test', value: 'Test Value' }],
        unknownKeyValue: null,
      });
      expect(formatterWithoutUnknown.convertToText('unknown')).toBe('unknown');
      expect(formatterWithoutUnknown.convertToReact('unknown')).toBe('unknown');
    });

    test('falls back to null label for null/undefined when no unknownKeyValue is set', () => {
      const formatterWithoutUnknown = new StaticLookupFormat({
        lookupEntries: [{ key: 'test', value: 'Test Value' }],
        unknownKeyValue: null,
      });
      expect(formatterWithoutUnknown.convertToText(null)).toBe(NULL_LABEL);
      expect(formatterWithoutUnknown.convertToText(undefined)).toBe(NULL_LABEL);
      expectReactElementWithNull(formatterWithoutUnknown.convertToReact(null));
      expectReactElementWithNull(formatterWithoutUnknown.convertToReact(undefined));
    });

    test('falls back to unknownKeyValue for an empty string when no mapping exists', () => {
      const formatterWithUnknown = new StaticLookupFormat({
        lookupEntries: [{ key: 'test', value: 'Test Value' }],
        unknownKeyValue: 'Unknown',
      });
      expect(formatterWithUnknown.convertToText('')).toBe('Unknown');
      expect(formatterWithUnknown.convertToReact('')).toBe('Unknown');
    });

    test('falls back to empty label for an empty string when no unknownKeyValue is set', () => {
      const formatterWithoutUnknown = new StaticLookupFormat({
        lookupEntries: [{ key: 'test', value: 'Test Value' }],
        unknownKeyValue: null,
      });
      expect(formatterWithoutUnknown.convertToText('')).toBe(EMPTY_LABEL);
      expectReactElementWithBlank(formatterWithoutUnknown.convertToReact(''));
    });

    test('mapped values with HTML-like content are returned as plain text', () => {
      expect(formatter.convertToText('html')).toBe('<script>alert("test")</script>');
      expect(formatter.convertToReact('html')).toBe('<script>alert("test")</script>');
    });

    test('preserves highlight functionality via convertToReact', () => {
      const options = {
        field: { name: 'test_field' },
        hit: {
          highlight: {
            test_field: ['@kibana-highlighted-field@Test@/kibana-highlighted-field@ Value'],
          },
        },
      };
      expect(formatter.convertToReact('test', options)).toMatchInlineSnapshot(`
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

      expect(formatterWithoutCustomMapping.convertToText('')).toBe(EMPTY_LABEL);
      expectReactElementWithBlank(formatterWithoutCustomMapping.convertToReact(''));

      expect(formatterWithoutCustomMapping.convertToText(null)).toBe(NULL_LABEL);
      expectReactElementWithNull(formatterWithoutCustomMapping.convertToReact(null));

      expect(formatterWithoutCustomMapping.convertToText(undefined)).toBe(NULL_LABEL);
      expectReactElementWithNull(formatterWithoutCustomMapping.convertToReact(undefined));

      expect(formatterWithoutCustomMapping.convertToText('unknown')).toBe('unknown');
      expect(formatterWithoutCustomMapping.convertToReact('unknown')).toBe('unknown');
    });
  });

  describe('falsy mapped values', () => {
    test('correctly maps to empty string value (does not fall back to unknownKeyValue)', () => {
      const formatterWithEmptyStringValue = new StaticLookupFormat({
        lookupEntries: [{ key: 'empty', value: '' }],
        unknownKeyValue: 'Should Not Use',
      });
      expect(formatterWithEmptyStringValue.convertToText('empty')).toBe('');
      expect(formatterWithEmptyStringValue.convertToReact('empty')).toBe('');
    });

    test('skips entry with empty key and empty value, falls back to unknownKeyValue', () => {
      const formatterWithEmptyKeyAndValue = new StaticLookupFormat({
        lookupEntries: [{ key: '', value: '' }],
        unknownKeyValue: 'Unknown',
      });
      expect(formatterWithEmptyKeyAndValue.convertToText('')).toBe('Unknown');
      expect(formatterWithEmptyKeyAndValue.convertToReact('')).toBe('Unknown');
    });

    test('skips entry with undefined key and empty value, falls back to missing value label', () => {
      const formatterWithUndefinedKeyEmptyValue = new StaticLookupFormat({
        lookupEntries: [{ key: undefined, value: '' }],
        unknownKeyValue: null,
      });
      expect(formatterWithUndefinedKeyEmptyValue.convertToText('')).toBe(EMPTY_LABEL);
      expectReactElementWithBlank(formatterWithUndefinedKeyEmptyValue.convertToReact(''));
    });

    test('correctly maps to 0 value (does not fall back to unknownKeyValue)', () => {
      const formatterWithZeroValue = new StaticLookupFormat({
        lookupEntries: [{ key: 'zero', value: 0 }],
        unknownKeyValue: 'Should Not Use',
      });
      expect(formatterWithZeroValue.convertToText('zero')).toBe('0');
      expect(formatterWithZeroValue.convertToReact('zero')).toBe('0');
    });

    test('correctly maps to false value (does not fall back to unknownKeyValue)', () => {
      const formatterWithFalseValue = new StaticLookupFormat({
        lookupEntries: [{ key: 'falsy', value: false }],
        unknownKeyValue: 'Should Not Use',
      });
      expect(formatterWithFalseValue.convertToText('falsy')).toBe('false');
      expect(formatterWithFalseValue.convertToReact('falsy')).toBe('false');
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
      expect(formatter.convertToText(1)).toBe('Yes');
      expect(formatter.convertToReact(1)).toBe('Yes');
    });

    test('maps boolean false (0) to "false" key value', () => {
      expect(formatter.convertToText(0)).toBe('No');
      expect(formatter.convertToReact(0)).toBe('No');
    });

    test('maps string "true" to configured value', () => {
      expect(formatter.convertToText('true')).toBe('Yes');
      expect(formatter.convertToReact('true')).toBe('Yes');
    });

    test('maps string "false" to configured value', () => {
      expect(formatter.convertToText('false')).toBe('No');
      expect(formatter.convertToReact('false')).toBe('No');
    });
  });

  describe('edge cases', () => {
    test('handles empty lookupEntries array', () => {
      const emptyFormatter = new StaticLookupFormat({
        lookupEntries: [],
        unknownKeyValue: 'Default',
      });
      expect(emptyFormatter.convertToText('anything')).toBe('Default');
      expect(emptyFormatter.convertToReact('anything')).toBe('Default');
    });

    test('handles lookupEntries with empty objects', () => {
      const formatterWithEmptyEntries = new StaticLookupFormat({
        lookupEntries: [{}],
        unknownKeyValue: 'Default',
      });
      expect(formatterWithEmptyEntries.convertToText('test')).toBe('Default');
      expect(formatterWithEmptyEntries.convertToReact('test')).toBe('Default');
    });

    test('treats undefined key as empty string key when value is provided', () => {
      // This simulates the case where the user adds a lookup entry
      // but doesn't explicitly set the key (leaving it undefined)
      const formatterWithUndefinedKey = new StaticLookupFormat({
        lookupEntries: [{ key: undefined, value: 'Empty String Mapped' }],
        unknownKeyValue: null,
      });
      // Empty string should map to the value with undefined key
      expect(formatterWithUndefinedKey.convertToText('')).toBe('Empty String Mapped');
      expect(formatterWithUndefinedKey.convertToReact('')).toBe('Empty String Mapped');
    });

    test('treats null key as empty string key when value is provided', () => {
      const formatterWithNullKey = new StaticLookupFormat({
        lookupEntries: [{ key: null, value: 'Empty String Mapped' }],
        unknownKeyValue: null,
      });
      expect(formatterWithNullKey.convertToText('')).toBe('Empty String Mapped');
      expect(formatterWithNullKey.convertToReact('')).toBe('Empty String Mapped');
    });

    test('does not treat undefined key as empty string key when value is not provided', () => {
      const formatterWithEmptyEntry = new StaticLookupFormat({
        lookupEntries: [{ key: undefined, value: undefined }],
        unknownKeyValue: 'Unknown',
      });
      // Empty string should not be mapped, should fall back to unknownKeyValue
      expect(formatterWithEmptyEntry.convertToText('')).toBe('Unknown');
      expect(formatterWithEmptyEntry.convertToReact('')).toBe('Unknown');
    });
  });
});
