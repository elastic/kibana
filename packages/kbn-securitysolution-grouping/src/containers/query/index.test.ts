/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { GroupingQueryArgs } from './types';
import { getGroupingQuery, MAX_QUERY_SIZE, parseGroupingQuery } from '.';

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
  it.only('Sets terms query with missing argument for ', () => {
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
  it('Sets terms query when single stackBy field requested additionalAggregationsRoot', () => {
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
  it('Sets terms query when multiple stackBy fields requested', () => {
    const result = getGroupingQuery({
      ...testProps,
      groupByFields: ['kibana.alert.rule.name', 'kibana.alert.rule.description'],
    });
    expect(result.aggs.groupByFields.terms).toBeUndefined();
    expect(result.aggs.groupByFields.multi_terms).toEqual({
      terms: [
        { field: 'kibana.alert.rule.name', missing: '-' },
        { field: 'kibana.alert.rule.description', missing: '-' },
      ],
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
  it('Uses NaN for number fields', () => {
    const result = getGroupingQuery({ ...testProps, selectedGroupEsTypes: ['long'] });
    expect(result.aggs.groupByFields.multi_terms).toBeUndefined();
    expect(result.aggs.groupByFields.terms).toEqual({
      field: 'host.name',
      missing: 'NaN',
      size: MAX_QUERY_SIZE,
    });
  });
  it('Uses 0.0.0.0 for ip fields', () => {
    const result = getGroupingQuery({ ...testProps, selectedGroupEsTypes: ['ip'] });
    expect(result.aggs.groupByFields.multi_terms).toBeUndefined();
    expect(result.aggs.groupByFields.terms).toEqual({
      field: 'host.name',
      missing: '0.0.0.0',
      size: MAX_QUERY_SIZE,
    });
  });
  it('Uses 0 for date fields', () => {
    const result = getGroupingQuery({ ...testProps, selectedGroupEsTypes: ['date'] });
    expect(result.aggs.groupByFields.multi_terms).toBeUndefined();
    expect(result.aggs.groupByFields.terms).toEqual({
      field: 'host.name',
      missing: 0,
      size: MAX_QUERY_SIZE,
    });
  });

  it('parseGroupingQuery finds and flags the null group', () => {
    const data = [
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
    ];
    const result = parseGroupingQuery(data);
    expect(result).toEqual([
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
        key: ['-'],
        key_as_string: '-',
        isNullGroup: true,
        doc_count: 75,
      },
    ]);
  });
});
