/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Datatable } from '../../../../expressions';
import { createMockPieParams, createMockVisData } from '../mocks';
import { generateFormatters } from './formatters';

describe('generateFormatters', () => {
  const visParams = createMockPieParams();
  const visData = createMockVisData();
  const defaultFormatter = jest.fn((formatParams: any) => ({
    formatted: true,
    ...formatParams,
  }));

  beforeEach(() => {
    defaultFormatter.mockClear();
  });

  it('returns empty object, if labels should not be should ', () => {
    const formatters = generateFormatters(
      { ...visParams, labels: { ...visParams.labels, show: false } },
      visData,
      defaultFormatter
    );

    expect(formatters).toEqual({});
    expect(defaultFormatter.mock.calls.length).toBe(0);
  });

  it('returns formatters, if columns have meta parameters', () => {
    const formatters = generateFormatters(visParams, visData, defaultFormatter);

    expect(formatters).toEqual({
      'col-0-2': {
        formatted: true,
        id: 'terms',
        params: {
          id: 'string',
          otherBucketLabel: 'Other',
          missingBucketLabel: 'Missing',
        },
      },
      'col-1-1': {
        formatted: true,
        id: 'number',
      },
      'col-2-3': {
        formatted: true,
        id: 'terms',
        params: {
          id: 'boolean',
          otherBucketLabel: 'Other',
          missingBucketLabel: 'Missing',
        },
      },
      'col-3-1': {
        formatted: true,
        id: 'number',
      },
    });
    expect(defaultFormatter.mock.calls.length).toBe(visData.columns.length);
  });

  it('returns undefined formatters for columns without meta parameters', () => {
    const newVisData: Datatable = {
      ...visData,
      columns: visData.columns.map(({ meta, ...col }) => ({ ...col, meta: { type: 'string' } })),
    };

    const formatters = generateFormatters(visParams, newVisData, defaultFormatter);

    expect(formatters).toEqual({
      'col-0-2': undefined,
      'col-1-1': undefined,
      'col-2-3': undefined,
      'col-3-1': undefined,
    });
    expect(defaultFormatter.mock.calls.length).toBe(0);
  });
});
