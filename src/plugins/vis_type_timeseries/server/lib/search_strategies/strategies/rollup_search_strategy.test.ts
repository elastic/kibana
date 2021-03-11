/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RollupSearchStrategy } from './rollup_search_strategy';
import { Framework } from '../../../plugin';
import {
  VisTypeTimeseriesRequestHandlerContext,
  VisTypeTimeseriesVisDataRequest,
} from '../../../types';

jest.mock('./abstract_search_strategy', () => {
  class AbstractSearchStrategyMock {
    getFieldsForWildcard() {
      return [
        {
          name: 'day_of_week',
          type: 'object',
          esTypes: ['object'],
          searchable: true,
          aggregatable: true,
        },
      ];
    }
  }

  return {
    AbstractSearchStrategy: AbstractSearchStrategyMock,
  };
});

describe('Rollup Search Strategy', () => {
  let rollupResolvedData: Promise<any>;

  const requestContext = ({
    core: {
      elasticsearch: {
        client: {
          asCurrentUser: {
            rollup: {
              getRollupIndexCaps: jest.fn().mockImplementation(() => rollupResolvedData),
            },
          },
        },
      },
    },
  } as unknown) as VisTypeTimeseriesRequestHandlerContext;
  const framework = {} as Framework;

  const indexPattern = 'indexPattern';

  test('should create instance of RollupSearchRequest', () => {
    const rollupSearchStrategy = new RollupSearchStrategy(framework);

    expect(rollupSearchStrategy).toBeDefined();
  });

  describe('checkForViability', () => {
    let rollupSearchStrategy: RollupSearchStrategy;
    const rollupIndex = 'rollupIndex';

    beforeEach(() => {
      rollupSearchStrategy = new RollupSearchStrategy(framework);
      rollupSearchStrategy.getRollupData = jest.fn(() =>
        Promise.resolve({
          [rollupIndex]: {
            rollup_jobs: [
              {
                job_id: 'test',
                rollup_index: rollupIndex,
                index_pattern: 'kibana*',
                fields: {
                  order_date: [
                    {
                      agg: 'date_histogram',
                      delay: '1m',
                      interval: '1m',
                      time_zone: 'UTC',
                    },
                  ],
                  day_of_week: [
                    {
                      agg: 'terms',
                    },
                  ],
                },
              },
            ],
          },
        })
      );
    });

    test('isViable should be false for invalid index', async () => {
      const result = await rollupSearchStrategy.checkForViability(
        requestContext,
        {} as VisTypeTimeseriesVisDataRequest,
        (null as unknown) as string
      );

      expect(result).toEqual({
        isViable: false,
        capabilities: null,
      });
    });
  });

  describe('getRollupData', () => {
    let rollupSearchStrategy: RollupSearchStrategy;

    beforeEach(() => {
      rollupSearchStrategy = new RollupSearchStrategy(framework);
    });

    test('should return rollup data', async () => {
      rollupResolvedData = Promise.resolve({ body: 'data' });

      const rollupData = await rollupSearchStrategy.getRollupData(requestContext, indexPattern);

      expect(rollupData).toBe('data');
    });

    test('should return empty object in case of exception', async () => {
      rollupResolvedData = Promise.reject('data');

      const rollupData = await rollupSearchStrategy.getRollupData(requestContext, indexPattern);

      expect(rollupData).toEqual({});
    });
  });

  describe('getFieldsForWildcard', () => {
    let rollupSearchStrategy: RollupSearchStrategy;
    let fieldsCapabilities: Record<string, any>;

    const rollupIndex = 'rollupIndex';

    beforeEach(() => {
      rollupSearchStrategy = new RollupSearchStrategy(framework);
      fieldsCapabilities = {
        [rollupIndex]: {
          aggs: {
            terms: {
              day_of_week: { agg: 'terms' },
            },
          },
        },
      };
    });

    test('should return fields for wildcard', async () => {
      const fields = await rollupSearchStrategy.getFieldsForWildcard(
        requestContext,
        {} as VisTypeTimeseriesVisDataRequest,
        indexPattern,
        {
          fieldsCapabilities,
          rollupIndex,
        }
      );

      expect(fields).toEqual([
        {
          aggregatable: true,
          name: 'day_of_week',
          searchable: true,
          type: 'object',
          esTypes: ['object'],
        },
      ]);
    });
  });
});
