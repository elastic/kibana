/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import moment from 'moment';
import { Filter } from '@kbn/es-query';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { hasActiveFilter, getResolvedDateRange } from './utils';

const testFilter: Filter = {
  meta: {
    alias: null,
    disabled: false,
    negate: false,
  },
  query: { query: 'hi' },
};
const testFilterDisabled: Filter = {
  meta: {
    alias: null,
    disabled: true,
    negate: false,
  },
  query: { query: 'hi' },
};

const testFilterBroken = {} as Filter;

describe('hasActiveFilter', () => {
  test('only active filters', () => {
    const filters = [testFilter];
    const result = hasActiveFilter(filters);
    expect(result).toBe(true);
  });
  test('only disabled filters', () => {
    const filters = [testFilterDisabled];
    const result = hasActiveFilter(filters);
    expect(result).toBe(false);
  });
  test('disabled and active filters', () => {
    const filters = [testFilter, testFilterDisabled];
    const result = hasActiveFilter(filters);
    expect(result).toBe(true);
  });
  test('broken filter - edge case', () => {
    const filters = [testFilterBroken];
    const result = hasActiveFilter(filters);
    expect(result).toBe(true);
  });
});

describe('getResolvedDateRange', () => {
  const mockData = dataPluginMock.createStartContract();
  const timeFilterMock = mockData.query.timefilter.timefilter;

  test('gets the resolved date range from the contract if calculate bounds is not provided', () => {
    const timeFilterContract = {
      ...timeFilterMock,
      getTime: jest.fn(() => {
        return {
          from: 'now-7d/d',
          to: 'now',
        };
      }),
    };
    const date = getResolvedDateRange(timeFilterContract);
    expect(date).toEqual({ fromDate: 'now-7d/d', toDate: 'now' });
  });

  test('gets the resolved date range correctly calculating the bounds', () => {
    const min = moment().subtract(7, 'days');
    const max = moment();
    const timeFilterContract = {
      ...timeFilterMock,
      getTime: jest.fn(() => {
        return {
          from: 'now-7d/d',
          to: 'now',
        };
      }),
      calculateBounds: jest.fn(() => {
        return {
          min,
          max,
        };
      }),
    };
    const date = getResolvedDateRange(timeFilterContract);
    expect(date).toEqual({ fromDate: min.toISOString(), toDate: max.toISOString() });
  });

  test('gets the resolved date range from the contract defaults if getTime returns undefined', () => {
    const timeFilterContract = {
      ...timeFilterMock,
      getTimeDefaults: jest.fn(() => {
        return {
          from: 'now-15m',
          to: 'now',
        };
      }),
    };
    const date = getResolvedDateRange(timeFilterContract);
    expect(date).toEqual({ fromDate: 'now-15m', toDate: 'now' });
  });
});
