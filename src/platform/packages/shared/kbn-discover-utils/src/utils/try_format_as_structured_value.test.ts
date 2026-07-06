/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { generateEsHit } from '../__mocks__/es_hits';
import {
  STRUCTURED_VALUE_LENGTH_THRESHOLD,
  tryFormatAsStructuredValue,
} from './try_format_as_structured_value';

const hit = generateEsHit();

const createFieldFormats = (convertToReact: jest.Mock): FieldFormatsStart =>
  ({
    getDefaultInstance: jest.fn(() => ({ convertToReact } as unknown as FieldFormat)),
  } as unknown as FieldFormatsStart);

describe('tryFormatAsStructuredValue', () => {
  it('returns undefined when the value is undefined or null', () => {
    const fieldFormats = createFieldFormats(jest.fn());
    const getFormattedValue = jest.fn(() => 'foo');

    expect(
      tryFormatAsStructuredValue({ value: undefined, getFormattedValue, hit, fieldFormats })
    ).toBeUndefined();
    expect(
      tryFormatAsStructuredValue({ value: null, getFormattedValue, hit, fieldFormats })
    ).toBeUndefined();
    expect(getFormattedValue).not.toHaveBeenCalled();
  });

  it('returns undefined for a short, single-line, non-JSON value', () => {
    const fieldFormats = createFieldFormats(jest.fn());
    const getFormattedValue = jest.fn(() => 'a short message');

    const result = tryFormatAsStructuredValue({
      value: 'a short message',
      getFormattedValue,
      hit,
      fieldFormats,
    });

    expect(result).toBeUndefined();
    expect(getFormattedValue).not.toHaveBeenCalled();
  });

  it('treats a value longer than the threshold as a structured text value', () => {
    const fieldFormats = createFieldFormats(jest.fn());
    const longValue = 'a'.repeat(STRUCTURED_VALUE_LENGTH_THRESHOLD + 1);
    const getFormattedValue = jest.fn(() => 'formatted-long-value');

    const result = tryFormatAsStructuredValue({
      value: longValue,
      getFormattedValue,
      hit,
      fieldFormats,
    });

    expect(result).toEqual({ language: 'txt', content: 'formatted-long-value' });
  });

  it('treats a multi-line value as a structured text value regardless of length', () => {
    const fieldFormats = createFieldFormats(jest.fn());
    const getFormattedValue = jest.fn(() => 'formatted-multiline-value');

    const result = tryFormatAsStructuredValue({
      value: 'line one\nline two',
      getFormattedValue,
      hit,
      fieldFormats,
    });

    expect(result).toEqual({ language: 'txt', content: 'formatted-multiline-value' });
  });

  it('pretty-prints valid JSON values without invoking getFormattedValue', () => {
    const convertToReact = jest.fn((value: unknown) => value);
    const fieldFormats = createFieldFormats(convertToReact);
    const getFormattedValue = jest.fn(() => 'unused-for-json');
    const json = { foo: { bar: true } };

    const result = tryFormatAsStructuredValue({
      value: JSON.stringify(json),
      getFormattedValue,
      hit,
      fieldFormats,
    });

    expect(result?.language).toBe('json');
    expect(convertToReact).toHaveBeenCalledWith(
      JSON.stringify(json, null, 2),
      expect.objectContaining({ hit })
    );
    expect(getFormattedValue).not.toHaveBeenCalled();
  });

  it('preserves search-term highlighting when rendering pretty-printed JSON', () => {
    const convertToReact = jest.fn(
      (value: unknown) => `highlighted:${value}` // simulate highlight processing
    );
    const fieldFormats = createFieldFormats(convertToReact);
    const json = { message: 'contains a search term' };
    const hitWithHighlight = generateEsHit({
      highlight: {
        message: ['contains a @kibana-highlighted-field@search@/kibana-highlighted-field@ term'],
      },
    });

    const result = tryFormatAsStructuredValue({
      value: JSON.stringify(json),
      getFormattedValue: () => 'unused-for-json',
      hit: hitWithHighlight,
      fieldFormats,
      fieldName: 'message',
    });

    expect(convertToReact).toHaveBeenCalledWith(
      JSON.stringify(json, null, 2),
      expect.objectContaining({ hit: hitWithHighlight, field: { name: 'message' } })
    );
    expect(result?.content).toBe(`highlighted:${JSON.stringify(json, null, 2)}`);
  });
});
