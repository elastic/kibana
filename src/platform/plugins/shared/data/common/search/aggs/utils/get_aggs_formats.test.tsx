/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { isValidElement } from 'react';
import { render } from '@testing-library/react';
import { identity } from 'lodash';

import type { IFieldFormat, SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import { FieldFormat } from '@kbn/field-formats-plugin/common';
import { MultiFieldKey } from '../buckets/multi_field_key';
import { getAggsFormats } from './get_aggs_formats';
import { MISSING_TOKEN } from '@kbn/field-formats-common';

const getAggFormat = (
  mapping: SerializedFieldFormat,
  getFormat: (mapping: SerializedFieldFormat) => IFieldFormat
) => {
  const aggsFormats = getAggsFormats(getFormat);
  const AggFormat = aggsFormats.find((format) => format.id === mapping.id);
  if (!AggFormat) throw new Error(`No agg format with id: ${mapping.id}`);

  return new AggFormat(mapping.params);
};

const createMockNestedFormat = (overrides: Partial<IFieldFormat> = {}) =>
  ({
    convert: jest.fn().mockReturnValue('text'),
    reactConvert: jest.fn(),
    ...overrides,
  } as unknown as IFieldFormat);

describe('getAggsFormats', () => {
  let getFormat: jest.MockedFunction<(mapping: SerializedFieldFormat) => IFieldFormat>;

  beforeEach(() => {
    getFormat = jest.fn().mockImplementation(() => {
      const DefaultFieldFormat = FieldFormat.from(identity);
      return new DefaultFieldFormat();
    });
  });

  test('creates custom format for date_range', () => {
    const mapping = { id: 'date_range', params: {} };
    const format = getAggFormat(mapping, getFormat);

    expect(format.convert({ from: '2020-05-01', to: '2020-06-01' })).toBe(
      '2020-05-01 to 2020-06-01'
    );
    expect(format.convert({ to: '2020-06-01' })).toBe('Before 2020-06-01');
    expect(format.convert({ from: '2020-06-01' })).toBe('After 2020-06-01');
    expect(getFormat).toHaveBeenCalledTimes(1);
  });

  test('date_range does not crash on empty value', () => {
    const mapping = { id: 'date_range', params: {} };
    const format = getAggFormat(mapping, getFormat);

    expect(format.convert(undefined)).toBe('');
  });

  test('creates custom format for ip_range', () => {
    const mapping = { id: 'ip_range', params: {} };
    const format = getAggFormat(mapping, getFormat);

    expect(format.convert({ type: 'range', from: '10.0.0.1', to: '10.0.0.10' })).toBe(
      '10.0.0.1 to 10.0.0.10'
    );
    expect(format.convert({ type: 'range', to: '10.0.0.10' })).toBe('-Infinity to 10.0.0.10');
    expect(format.convert({ type: 'range', from: '10.0.0.10' })).toBe('10.0.0.10 to Infinity');
    format.convert({ type: 'mask', mask: '10.0.0.1/24' });
    expect(getFormat).toHaveBeenCalledTimes(1);
  });

  test('ip_range does not crash on empty value', () => {
    const mapping = { id: 'ip_range', params: {} };
    const format = getAggFormat(mapping, getFormat);

    expect(format.convert(undefined)).toBe('');
  });

  test('creates custom format for range', () => {
    const mapping = { id: 'range', params: {} };
    const format = getAggFormat(mapping, getFormat);

    expect(format.convert({ gte: 1, lt: 20 })).toBe('≥ 1 and < 20');
    expect(getFormat).toHaveBeenCalledTimes(1);
  });

  test('range does not crash on empty value', () => {
    const mapping = { id: 'range', params: {} };
    const format = getAggFormat(mapping, getFormat);

    expect(format.convert(undefined)).toBe('');
  });

  test('creates alternative format for range using the template parameter', () => {
    const mapping = { id: 'range', params: { template: 'arrow_right' } };
    const format = getAggFormat(mapping, getFormat);

    expect(format.convert({ gte: 1, lt: 20 })).toBe('1 → 20');
    expect(getFormat).toHaveBeenCalledTimes(1);
  });

  test('handles Infinity values internally when no nestedFormatter is passed', () => {
    const mapping = { id: 'range', params: { replaceInfinity: true } };
    const format = getAggFormat(mapping, getFormat);

    expect(format.convert({ gte: -Infinity, lt: Infinity })).toBe('≥ −∞ and < +∞');
    expect(getFormat).toHaveBeenCalledTimes(1);
  });

  test('lets Infinity values handling to nestedFormatter even when flag is on', () => {
    const mapping = { id: 'range', params: { replaceInfinity: true, id: 'any' } };
    const format = getAggFormat(mapping, getFormat);

    expect(format.convert({ gte: -Infinity, lt: Infinity })).toBe('≥ -Infinity and < Infinity');
    expect(getFormat).toHaveBeenCalledTimes(1);
  });

  test('returns custom label for range if provided', () => {
    const mapping = { id: 'range', params: {} };

    const format = getAggFormat(mapping, getFormat);

    expect(format.convert({ gte: 1, lt: 20, label: 'custom' })).toBe('custom');
    // underlying formatter is not called because custom label can be used directly
    expect(getFormat).toHaveBeenCalledTimes(0);
  });

  describe('terms', () => {
    const termsMapping = {
      id: 'terms',
      params: {
        otherBucketLabel: 'other bucket',
        missingBucketLabel: 'missing bucket',
      },
    };

    test('creates custom format for terms', () => {
      const format = getAggFormat(termsMapping, getFormat);

      expect(format.convert('machine.os.keyword')).toBe('machine.os.keyword');
      expect(format.convert('__other__')).toBe(termsMapping.params.otherBucketLabel);
      expect(format.convert(MISSING_TOKEN)).toBe(termsMapping.params.missingBucketLabel);
      expect(getFormat).toHaveBeenCalledTimes(1);
    });

    test('returns special bucket labels directly without calling nested formatter', () => {
      const mockReactConvert = jest.fn();
      const mockNestedFormat = createMockNestedFormat({ reactConvert: mockReactConvert });

      const format = getAggFormat(termsMapping, () => mockNestedFormat);

      expect(format.reactConvert('__other__')).toBe('other bucket');
      expect(format.reactConvert(MISSING_TOKEN)).toBe('missing bucket');
      expect(mockReactConvert).not.toHaveBeenCalled();
    });

    test('renders links from URL-formatted nested formatter', () => {
      const mockReactConvert = jest.fn().mockReturnValue(
        <a href="http://example.com" target="_blank" rel="noopener noreferrer">
          example.com
        </a>
      );
      const mockNestedFormat = createMockNestedFormat({ reactConvert: mockReactConvert });

      const format = getAggFormat(termsMapping, () => mockNestedFormat);
      const result = format.reactConvert('http://example.com');
      expect(isValidElement(result)).toBe(true);

      const { container } = render(<>{result}</>);
      const link = container.querySelector('a');

      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'http://example.com');
      expect(link).toHaveTextContent('example.com');
    });
  });

  describe('multi_terms', () => {
    const multiTermsMapping = {
      id: 'multi_terms',
      params: {
        paramsPerField: [{ id: 'terms' }, { id: 'terms' }, { id: 'terms' }],
      },
    };

    test('uses a default separator for multi terms', () => {
      const terms = ['source', 'geo.src', 'geo.dest'];
      const format = getAggFormat(multiTermsMapping, getFormat);

      expect(format.convert(new MultiFieldKey({ key: terms }))).toBe('source › geo.src › geo.dest');
      expect(getFormat).toHaveBeenCalledTimes(terms.length);
    });

    test('uses a custom separator for multi terms when passed', () => {
      const terms = ['source', 'geo.src', 'geo.dest'];
      const mapping = {
        id: 'multi_terms',
        params: {
          paramsPerField: [{ id: 'terms' }, { id: 'terms' }, { id: 'terms' }],
          separator: ' - ',
        },
      };

      const format = getAggFormat(mapping, getFormat);

      expect(format.convert(new MultiFieldKey({ key: terms }))).toBe('source - geo.src - geo.dest');
      expect(getFormat).toHaveBeenCalledTimes(terms.length);
    });

    test('returns empty string for non-MultiFieldKey values', () => {
      const format = getAggFormat(multiTermsMapping, getFormat);
      expect(format.convert('text')).toBe('');
    });

    test('returns empty string for non-MultiFieldKey in reactConvert', () => {
      const mockNestedFormat = createMockNestedFormat();
      const format = getAggFormat(multiTermsMapping, () => mockNestedFormat);

      expect(format.reactConvert('not-a-multi-field-key')).toBe('');
    });

    test('returns other bucket label directly without calling nested formatter', () => {
      const mockReactConvert = jest.fn();
      const mockNestedFormat = createMockNestedFormat({ reactConvert: mockReactConvert });

      const format = getAggFormat(
        {
          ...multiTermsMapping,
          params: { ...multiTermsMapping.params, otherBucketLabel: 'Other' },
        },
        () => mockNestedFormat
      );

      expect(format.reactConvert('__other__')).toBe('Other');
      expect(mockReactConvert).not.toHaveBeenCalled();
    });

    test('renders links from URL-formatted nested formatters', () => {
      const mockReactConvert = jest.fn().mockImplementation((val) => (
        <a href={`http://${val}`} target="_blank" rel="noopener noreferrer">
          {val}
        </a>
      ));
      const mockNestedFormat = createMockNestedFormat({ reactConvert: mockReactConvert });

      const format = getAggFormat(
        {
          ...multiTermsMapping,
          params: { paramsPerField: [{ id: 'url' }, { id: 'url' }], separator: ' | ' },
        },
        () => mockNestedFormat
      );
      const result = format.reactConvert(new MultiFieldKey({ key: ['a.com', 'b.com'] }));

      const { container } = render(<>{result}</>);
      const links = container.querySelectorAll('a');

      expect(links).toHaveLength(2);
      expect(links[0]).toHaveAttribute('href', 'http://a.com');
      expect(links[1]).toHaveAttribute('href', 'http://b.com');
      expect(container.textContent).toContain(' | ');
    });
  });
});
