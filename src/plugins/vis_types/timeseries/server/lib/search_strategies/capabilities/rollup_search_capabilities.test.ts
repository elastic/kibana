/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Unit } from '@kbn/datemath';
import type { Panel } from '../../../../common/types';
import { RollupSearchCapabilities } from './rollup_search_capabilities';

describe('Rollup Search Capabilities', () => {
  const testTimeZone = 'time_zone';
  const testInterval = '10s';
  const rollupIndex = 'rollupIndex';

  let fieldsCapabilities: Record<string, any>;
  let rollupSearchCaps: RollupSearchCapabilities;

  beforeEach(() => {
    fieldsCapabilities = {
      [rollupIndex]: {
        aggs: {
          date_histogram: {
            histogram_field: {
              time_zone: testTimeZone,
              interval: testInterval,
            },
          },
        },
      },
    };

    rollupSearchCaps = new RollupSearchCapabilities(
      { maxBucketsLimit: 2000, timezone: 'UTC', panel: {} as Panel },
      fieldsCapabilities,
      rollupIndex
    );
  });

  test('should create instance of RollupSearchRequest', () => {
    expect(rollupSearchCaps.rollupIndex).toBe(rollupIndex);
  });

  test('should return the "timezone" for the rollup request', () => {
    expect(rollupSearchCaps.timezone).toBe(testTimeZone);
  });

  test('should return the default "interval" for the rollup request', () => {
    expect(rollupSearchCaps.defaultTimeInterval).toBe(testInterval);
  });

  describe('getValidTimeInterval', () => {
    let rollupJobInterval: { value: number; unit: Unit };
    let userInterval: { value: number; unit: Unit };
    let getSuitableUnit: Unit;

    beforeEach(() => {
      rollupSearchCaps.parseInterval = jest
        .fn()
        .mockImplementationOnce(() => rollupJobInterval)
        .mockImplementationOnce(() => userInterval);

      rollupSearchCaps.convertIntervalToUnit = jest.fn(() => userInterval);
      rollupSearchCaps.getSuitableUnit = jest.fn(() => getSuitableUnit);
    });

    test('should return 1d as common interval for 5d(user interval) and 1d(rollup interval) - calendar intervals', () => {
      rollupJobInterval = {
        value: 1,
        unit: 'd',
      };
      userInterval = {
        value: 5,
        unit: 'd',
      };

      getSuitableUnit = 'd';

      expect(rollupSearchCaps.getValidTimeInterval('')).toBe('1d');
    });

    test('should return 1w as common interval for 7d(user interval) and 1d(rollup interval) - calendar intervals', () => {
      rollupJobInterval = {
        value: 1,
        unit: 'd',
      };
      userInterval = {
        value: 7,
        unit: 'd',
      };

      getSuitableUnit = 'w';

      expect(rollupSearchCaps.getValidTimeInterval('')).toBe('1w');
    });

    test('should return 1w as common interval for 1d(user interval) and 1w(rollup interval) - calendar intervals', () => {
      rollupJobInterval = {
        value: 1,
        unit: 'w',
      };
      userInterval = {
        value: 1,
        unit: 'd',
      };

      getSuitableUnit = 'w';

      expect(rollupSearchCaps.getValidTimeInterval('')).toBe('1w');
    });

    test('should return 2y as common interval for 0.1y(user interval) and 2y(rollup interval) - fixed intervals', () => {
      rollupJobInterval = {
        value: 2,
        unit: 'y',
      };
      userInterval = {
        value: 0.1,
        unit: 'y',
      };

      expect(rollupSearchCaps.getValidTimeInterval('')).toBe('2y');
    });

    test('should return 3h as common interval for 2h(user interval) and 3h(rollup interval) - fixed intervals', () => {
      rollupJobInterval = {
        value: 3,
        unit: 'h',
      };
      userInterval = {
        value: 2,
        unit: 'h',
      };

      expect(rollupSearchCaps.getValidTimeInterval('')).toBe('3h');
    });

    test('should return 6m as common interval for 4m(user interval) and 3m(rollup interval) - fixed intervals', () => {
      rollupJobInterval = {
        value: 3,
        unit: 'm',
      };
      userInterval = {
        value: 4,
        unit: 'm',
      };

      expect(rollupSearchCaps.getValidTimeInterval('')).toBe('6m');
    });
  });
});
