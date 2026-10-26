/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getAdjustedInterval } from '@kbn/charts-plugin/public';
import type { DatatableUtilitiesService } from '@kbn/data-plugin/common';
import type { CommonXYDataLayerConfig } from '../../common';
import { getXDomain } from './x_domain';

const ADJUSTED_INTERVAL = 1618; // arbitrary value returned by the getAdjustedInterval mock

jest.mock('@kbn/charts-plugin/public', () => ({
  Endzones: () => null,
  getAdjustedInterval: jest.fn(() => ADJUSTED_INTERVAL),
}));

const getAdjustedIntervalMock = getAdjustedInterval as jest.MockedFunction<
  typeof getAdjustedInterval
>;

beforeEach(() => {
  getAdjustedIntervalMock.mockClear();
});

interface DateHistogramMeta {
  timeRange?: { from: string; to: string };
  dropPartials?: boolean;
}

// Mirrors the real DatatableUtilitiesService, which reads the precomputed extent from
// sourceParams.computedDomain and surfaces it as meta.domain.
const createDatatableUtilities = (meta?: DateHistogramMeta): DatatableUtilitiesService =>
  ({
    getDateHistogramMeta: jest.fn(
      (column?: { meta?: { sourceParams?: { computedDomain?: { min: number; max: number } } } }) =>
        meta && { ...meta, domain: column?.meta?.sourceParams?.computedDomain }
    ),
    getColumnTimeRange: jest.fn().mockReturnValue(meta?.timeRange),
  } as unknown as DatatableUtilitiesService);

const createLayer = (
  values: number[],
  computedDomain?: { min: number; max: number }
): CommonXYDataLayerConfig =>
  ({
    xAccessor: 'x',
    table: {
      columns: [
        {
          id: 'x',
          name: 'x',
          meta: {
            type: 'date',
            field: '@timestamp',
            ...(computedDomain ? { sourceParams: { computedDomain } } : {}),
          },
        },
      ],
      rows: values.map((value) => ({ x: value })),
    },
  } as unknown as CommonXYDataLayerConfig);

// [1970-01-01T00:00:00.000Z, 1970-01-01T00:00:10.000Z], so timestamps map to 0..10000ms.
const TIME_RANGE = {
  from: '1970-01-01T00:00:00.000Z',
  to: '1970-01-01T00:00:10.000Z',
};

const datatableUtilities = createDatatableUtilities({ timeRange: TIME_RANGE, dropPartials: false });

describe('getXDomain', () => {
  describe('extent (min/max)', () => {
    it('derives the extent from the row values and the applied time range', () => {
      const { baseDomain, extendedDomain } = getXDomain(
        datatableUtilities,
        [createLayer([2000, 5000])],
        1000,
        true,
        false,
        true,
        'UTC'
      );

      expect(baseDomain).toEqual({ min: 0, max: 10000, minInterval: 1000 });
      expect(extendedDomain).toEqual({ min: 0, max: 9000, minInterval: 1000 });
    });

    it('uses the precomputed extent from the column meta when present', () => {
      const { extendedDomain } = getXDomain(
        datatableUtilities,
        [createLayer([2000, 5000], { min: 500, max: 8500 })],
        1000,
        true,
        false,
        true,
        'UTC'
      );

      expect(extendedDomain).toEqual({ min: 500, max: 8500, minInterval: 1000 });
    });

    it('merges precomputed extents across layers', () => {
      const { extendedDomain } = getXDomain(
        datatableUtilities,
        [
          createLayer([2000, 5000], { min: 1000, max: 7000 }),
          createLayer([3000, 9000], { min: 500, max: 9000 }),
        ],
        1000,
        true,
        false,
        true,
        'UTC'
      );

      expect(extendedDomain).toEqual({ min: 500, max: 9000, minInterval: 1000 });
    });
  });

  describe('minInterval', () => {
    it('passes the interval through unchanged for fixed-width units', () => {
      const { extendedDomain } = getXDomain(
        datatableUtilities,
        [createLayer([2000, 5000])],
        1000,
        true,
        false,
        true,
        'UTC'
      );

      expect(getAdjustedIntervalMock).not.toHaveBeenCalled();
      expect(extendedDomain).toHaveProperty('minInterval', 1000);
    });

    it('adjusts the interval from the data for calendar units', () => {
      const { extendedDomain } = getXDomain(
        datatableUtilities,
        [createLayer([2000, 5000])],
        1000 * 60 * 60 * 24, // 1 day in milliseconds
        true,
        false,
        true,
        'UTC'
      );

      expect(getAdjustedIntervalMock).toHaveBeenCalledTimes(1);
      expect(extendedDomain).toHaveProperty('minInterval', ADJUSTED_INTERVAL);
    });
  });

  it('returns the base domain when no interval is available', () => {
    const { baseDomain, extendedDomain } = getXDomain(
      datatableUtilities,
      [createLayer([2000, 5000])],
      undefined,
      true,
      false,
      true,
      'UTC'
    );

    expect(baseDomain).toHaveProperty('minInterval', undefined);
    expect(extendedDomain).toBe(baseDomain);
  });
});
