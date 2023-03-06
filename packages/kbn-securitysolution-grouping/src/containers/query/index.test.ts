/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { GroupingQueryArgs } from './types';
import { getGroupingQuery, MAX_QUERY_SIZE } from '.';

const testProps: GroupingQueryArgs = {
  additionalFilters: [],
  additionalAggregationsRoot: [],
  additionalStatsAggregationsFields0: [
    {
      alertsCount: {
        cardinality: {
          field: 'kibana.alert.uuid',
        },
      },
    },
    {
      rulesCountAggregation: {
        cardinality: {
          field: 'kibana.alert.rule.rule_id',
        },
      },
    },
    {
      countSeveritySubAggregation: {
        cardinality: {
          field: 'kibana.alert.severity',
        },
      },
    },
    {
      severitiesSubAggregation: {
        terms: {
          field: 'kibana.alert.severity',
        },
      },
    },
    {
      usersCountAggregation: {
        cardinality: {
          field: 'user.name',
        },
      },
    },
  ],
  additionalStatsAggregationsFields1: [],
  from: '2022-12-28T15:35:32.871Z',
  runtimeMappings: {},
  stackByMultipleFields0: ['host.name'],
  stackByMultipleFields0Size: 25,
  stackByMultipleFields0From: 0,
  stackByMultipleFields1: [],
  stackByMultipleFields1Size: 10,
  to: '2023-02-23T06:59:59.999Z',
};
describe('group selector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('Sets terms query when single stackBy field requested', () => {
    const result = getGroupingQuery(testProps);
    expect(result.aggs.stackByMultipleFields0.multi_terms).toBeUndefined();
    expect(result.aggs.stackByMultipleFields0.terms).toEqual({
      field: 'host.name',
      size: MAX_QUERY_SIZE,
    });
    expect(result.aggs.stackByMultipleFields0.aggs).toEqual({
      bucket_truncate: { bucket_sort: { from: 0, size: 25 } },
      alertsCount: { cardinality: { field: 'kibana.alert.uuid' } },
      rulesCountAggregation: { cardinality: { field: 'kibana.alert.rule.rule_id' } },
      countSeveritySubAggregation: { cardinality: { field: 'kibana.alert.severity' } },
      severitiesSubAggregation: { terms: { field: 'kibana.alert.severity' } },
      usersCountAggregation: { cardinality: { field: 'user.name' } },
    });
    expect(result.aggs.alertsCount).toBeUndefined();
    expect(result.aggs.groupsNumber).toBeUndefined();
    expect(result.query.bool.filter.length).toEqual(1);
  });
  it('Sets terms query when single stackBy field requested additionalAggregationsRoot', () => {
    const result = getGroupingQuery({
      ...testProps,
      additionalAggregationsRoot: [
        {
          alertsCount: {
            terms: {
              field: 'kibana.alert.rule.producer',
              exclude: ['alerts'],
            },
          },
        },
        {
          groupsNumber: {
            cardinality: {
              field: 'host.name',
            },
          },
        },
      ],
    });
    expect(result.aggs.alertsCount).toEqual({
      terms: { field: 'kibana.alert.rule.producer', exclude: ['alerts'] },
    });
    expect(result.aggs.groupsNumber).toEqual({ cardinality: { field: 'host.name' } });
  });
  it('Sets terms query when multiple stackBy fields requested', () => {
    const result = getGroupingQuery({
      ...testProps,
      stackByMultipleFields0: ['kibana.alert.rule.name', 'kibana.alert.rule.description'],
    });
    expect(result.aggs.stackByMultipleFields0.terms).toBeUndefined();
    expect(result.aggs.stackByMultipleFields0.multi_terms).toEqual({
      terms: [{ field: 'kibana.alert.rule.name' }, { field: 'kibana.alert.rule.description' }],
      size: MAX_QUERY_SIZE,
    });
  });
  it('Additional filters get added to the query', () => {
    const result = getGroupingQuery({
      ...testProps,
      additionalFilters: [
        {
          bool: {
            must: [],
            filter: [
              {
                term: {
                  'kibana.alert.workflow_status': 'open',
                },
              },
            ],
            should: [],
            must_not: [
              {
                exists: {
                  field: 'kibana.alert.building_block_type',
                },
              },
            ],
          },
        },
      ],
    });
    expect(result.query.bool.filter.length).toEqual(2);
  });
});
