/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement } from 'react';
import { isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createTextFieldFormatter, createReactFieldFormatter } from './create_field_formatter';
import { getFieldFormatsRegistry } from '@kbn/data-plugin/public/test_utils';
import { setFieldFormats } from '../../../services';
import { FORMATS_UI_SETTINGS } from '@kbn/field-formats-plugin/common';
import type { CoreSetup } from '@kbn/core/public';

const mockUiSettings = {
  get: jest.fn((item: keyof typeof mockUiSettings) => mockUiSettings[item]),
  [FORMATS_UI_SETTINGS.FORMAT_BYTES_DEFAULT_PATTERN]: '0,0.[000]b',
  [FORMATS_UI_SETTINGS.FORMAT_NUMBER_DEFAULT_PATTERN]: '0,0.[000]',
} as unknown as CoreSetup['uiSettings'];

describe('createTextFieldFormatter and createReactFieldFormatter', () => {
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
    const textFormatter = createTextFieldFormatter('bytesField', fieldFormatMap);
    const reactFormatter = createReactFieldFormatter('bytesField', fieldFormatMap);

    expect(textFormatter(value)).toBe('1.15GB');
    expect(reactFormatter(value)).toBe('1.15GB');
  });

  it('should return base64 formatted value for stringField', () => {
    const textFormatter = createTextFieldFormatter('stringField', fieldFormatMap);
    const reactFormatter = createReactFieldFormatter('stringField', fieldFormatMap);

    expect(textFormatter(value)).toBe('×møç®ü÷');
    expect(reactFormatter(value)).toBe('×møç®ü÷');
  });

  it('should return formatted value for colorField (text vs react element)', () => {
    const textFormatter = createTextFieldFormatter('colorField', fieldFormatMap);
    const reactFormatter = createReactFieldFormatter('colorField', fieldFormatMap);

    const textResult = textFormatter(value);
    const reactResult = reactFormatter(value);

    expect(textResult).toBe('1234567890');
    expect(isValidElement(reactResult)).toBe(true);
    expect(renderToStaticMarkup(reactResult as ReactElement)).toBe(
      '<span style="color:#D36086;background-color:#ffffff;display:inline-block;padding:0 8px;border-radius:3px">1234567890</span>'
    );
  });

  it('should return number formatted value for colorField when color rules are applied', () => {
    const textFormatter = createTextFieldFormatter('colorField', fieldFormatMap, true);
    const reactFormatter = createReactFieldFormatter('colorField', fieldFormatMap, true);

    expect(textFormatter(value)).toBe('1,234,567,890');
    expect(reactFormatter(value)).toBe('1,234,567,890');
  });

  it('should return not formatted string value for colorField when color rules are applied', () => {
    const textFormatter = createTextFieldFormatter('colorField', fieldFormatMap, true);
    const reactFormatter = createReactFieldFormatter('colorField', fieldFormatMap, true);

    expect(textFormatter(stringValue)).toBe(stringValue);
    expect(reactFormatter(stringValue)).toBe(stringValue);
  });

  it('should return formatted value for urlField (text vs react element)', () => {
    const textFormatter = createTextFieldFormatter('urlField', fieldFormatMap);
    const reactFormatter = createReactFieldFormatter('urlField', fieldFormatMap);

    const textResult = textFormatter(value);
    const reactResult = reactFormatter(value);

    expect(textResult).toBe('1234567890');
    expect(isValidElement(reactResult)).toBe(true);
    expect(renderToStaticMarkup(reactResult as ReactElement)).toBe(
      '<a href="https://1234567890" target="_blank" rel="noopener noreferrer">1234567890</a>'
    );
  });

  it('should return "-" for null value when field has format', () => {
    const textFormatter = createTextFieldFormatter('bytesField', fieldFormatMap);
    const reactFormatter = createReactFieldFormatter('bytesField', fieldFormatMap);

    expect(textFormatter(null)).toBe('-');
    expect(reactFormatter(null)).toBe('-');
  });

  it('should return "-" for null value when field that has no format', () => {
    const textFormatter = createTextFieldFormatter('urlField', fieldFormatMap);
    const reactFormatter = createReactFieldFormatter('urlField', fieldFormatMap);

    expect(textFormatter(null)).toBe('-');
    expect(reactFormatter(null)).toBe('-');
  });

  it('should return number formatted value for number when field has no format', () => {
    const textFormatter = createTextFieldFormatter('noSuchField', fieldFormatMap);
    const reactFormatter = createReactFieldFormatter('noSuchField', fieldFormatMap);

    expect(textFormatter(value)).toBe('1,234,567,890');
    expect(reactFormatter(value)).toBe('1,234,567,890');
  });

  it('should not format string value when field has no format', () => {
    const textFormatter = createTextFieldFormatter('noSuchField', fieldFormatMap);
    const reactFormatter = createReactFieldFormatter('noSuchField', fieldFormatMap);

    expect(textFormatter(stringValue)).toBe(stringValue);
    expect(reactFormatter(stringValue)).toBe(stringValue);
  });
});
