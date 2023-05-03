/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { GroupingQueryArgs } from './types';
import { getGroupingQuery, parseGroupingQuery } from '.';
import { getEmptyValue } from './helpers';
import { GroupingAggregation } from '../../..';

const testProps: GroupingQueryArgs = {
  additionalFilters: [],
  from: '2022-12-28T15:35:32.871Z',
  groupByField: 'host.name',
  statsAggregations: [
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
  pageNumber: 0,
  rootAggregations: [],
  runtimeMappings: {},
  selectedGroupEsTypes: ['keyword'],
  size: 25,
  to: '2023-02-23T06:59:59.999Z',
};
describe('group selector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('Sets multi terms query with missing argument for 2 default values', () => {
    const result = getGroupingQuery(testProps);
    result.aggs.groupByFields?.multi_terms?.terms.forEach((term, i) => {
      expect(term).toEqual({
        field: 'host.name',
        missing: i === 0 ? '-' : '--',
      });
    });
    expect(result.aggs.groupByFields.aggs).toEqual({
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
  it('Sets additional rootAggregations', () => {
    const result = getGroupingQuery({
      ...testProps,
      rootAggregations: [
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
  it('Uses 0/1 for number fields', () => {
    const result = getGroupingQuery({ ...testProps, selectedGroupEsTypes: ['long'] });
    result.aggs.groupByFields?.multi_terms?.terms.forEach((term, i) => {
      expect(term).toEqual({
        field: 'host.name',
        missing: i === 0 ? 0 : 1,
      });
    });
  });
  it('Uses 0.0.0.0/:: for ip fields', () => {
    const result = getGroupingQuery({ ...testProps, selectedGroupEsTypes: ['ip'] });
    result.aggs.groupByFields?.multi_terms?.terms.forEach((term, i) => {
      expect(term).toEqual({
        field: 'host.name',
        missing: i === 0 ? '0.0.0.0' : '::',
      });
    });
  });
  const groupingAggs = {
    groupByFields: {
      buckets: [
        {
          key: ['20.80.64.28', '20.80.64.28'],
          key_as_string: '20.80.64.28|20.80.64.28',
          doc_count: 75,
        },
        {
          key: ['0.0.0.0', '0.0.0.0'],
          key_as_string: '0.0.0.0|0.0.0.0',
          doc_count: 75,
        },
        {
          key: ['0.0.0.0', '::'],
          key_as_string: '0.0.0.0|::',
          doc_count: 75,
        },
      ],
    },
    unitsCount: {
      value: 100,
    },
    unitsCountWithoutNull: {
      value: 100,
    },
    groupsCount: {
      value: 20,
    },
  };
  it('parseGroupingQuery finds and flags the null group', () => {
    const result = parseGroupingQuery(groupingAggs);
    expect(result).toEqual({
      groupByFields: {
        buckets: [
          {
            key: ['20.80.64.28'],
            key_as_string: '20.80.64.28',
            doc_count: 75,
          },
          {
            key: ['0.0.0.0'],
            key_as_string: '0.0.0.0',
            doc_count: 75,
          },
          {
            key: [getEmptyValue()],
            key_as_string: getEmptyValue(),
            isNullGroup: true,
            doc_count: 75,
          },
        ],
      },
      unitsCount: {
        value: 100,
      },
      unitsCountWithoutNull: {
        value: 100,
      },
      groupsCount: {
        value: 20,
      },
    });
  });
  it('parseGroupingQuery adjust group count when null field group is present', () => {
    const result: GroupingAggregation<{}> = parseGroupingQuery({
      ...groupingAggs,
      unitsCountWithoutNull: { value: 99 },
    });

    expect(result.groupsCount?.value).toEqual(21);
  });
});
