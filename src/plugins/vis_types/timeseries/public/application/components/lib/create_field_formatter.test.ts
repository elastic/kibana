/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createFieldFormatter } from './create_field_formatter';
import { getFieldFormatsRegistry } from '@kbn/data-plugin/public/test_utils';
import { setFieldFormats } from '../../../services';
import { FORMATS_UI_SETTINGS } from '@kbn/field-formats-plugin/common';
import type { CoreSetup } from '@kbn/core/public';

const mockUiSettings = {
  get: jest.fn((item: keyof typeof mockUiSettings) => mockUiSettings[item]),
  [FORMATS_UI_SETTINGS.FORMAT_BYTES_DEFAULT_PATTERN]: '0,0.[000]b',
  [FORMATS_UI_SETTINGS.FORMAT_NUMBER_DEFAULT_PATTERN]: '0,0.[000]',
} as unknown as CoreSetup['uiSettings'];

describe('createFieldFormatter(fieldName, fieldFormatMap?, contextType?, hasColorRules)', () => {
  setFieldFormats(
    getFieldFormatsRegistry({
      uiSettings: mockUiSettings,
    } as unknown as CoreSetup)
  );
  const value = 1234567890;
  const stringValue = 'some string';
  const fieldFormatMap = {
    bytesField: {
      id: 'bytes',
    },
    stringField: {
      id: 'string',
      params: {
        transform: 'base64',
      },
    },
    colorField: {
      id: 'color',
      params: {
        fieldType: 'number',
        colors: [
          {
            range: '-Infinity:Infinity',
            regex: '<insert regex>',
            text: '#D36086',
            background: '#ffffff',
          },
        ],
      },
    },
    urlField: {
      id: 'url',
      params: {
        urlTemplate: 'https://{{value}}',
        labelTemplate: '{{value}}',
      },
    },
  };

  it('should return byte formatted value for bytesField', () => {
    const formatter = createFieldFormatter('bytesField', fieldFormatMap);

    expect(formatter(value)).toBe('1.15GB');
  });

  it('should return base64 formatted value for stringField', () => {
    const formatter = createFieldFormatter('stringField', fieldFormatMap);

    expect(formatter(value)).toBe('×møç®ü÷');
  });

  it('should return color formatted value for colorField', () => {
    const formatter = createFieldFormatter('colorField', fieldFormatMap, 'html');

    expect(formatter(value)).toBe(
      '<span style="color:#D36086;background-color:#ffffff">1234567890</span>'
    );
  });

  it('should return number formatted value wrapped in span for colorField when color rules are applied', () => {
    const formatter = createFieldFormatter('colorField', fieldFormatMap, 'html', true);

    expect(formatter(value)).toBe('1,234,567,890');
  });

  it('should return not formatted string value for colorField when color rules are applied', () => {
    const formatter = createFieldFormatter('colorField', fieldFormatMap, 'html', true);

    expect(formatter(stringValue)).toBe(stringValue);
  });

  it('should return url formatted value for urlField', () => {
    const formatter = createFieldFormatter('urlField', fieldFormatMap, 'html');

    expect(formatter(value)).toBe(
      '<a href="https://1234567890" target="_blank" rel="noopener noreferrer">1234567890</a>'
    );
  });

  it('should return "-" for null value when field has format', () => {
    const formatter = createFieldFormatter('bytesField', fieldFormatMap);

    expect(formatter(null)).toBe('-');
  });

  it('should return "-" for null value when field that has no format', () => {
    const formatter = createFieldFormatter('urlField', fieldFormatMap);

    expect(formatter(null)).toBe('-');
  });

  it('should return number formatted value for number when field has no format', () => {
    const formatter = createFieldFormatter('noSuchField', fieldFormatMap);

    expect(formatter(value)).toBe('1,234,567,890');
  });

  it('should not format string value when field has no format', () => {
    const formatter = createFieldFormatter('noSuchField', fieldFormatMap);

    expect(formatter(stringValue)).toBe(stringValue);
  });
});
