/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GroupingQueryArgs } from './types';
import { getGroupingQuery, parseGroupingQuery } from '.';
import { getEmptyValue } from './helpers';
import { GroupingAggregation } from '../../..';
import { groupingBucket } from '../../mocks';

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
  uniqueValue: 'whatAGreatAndUniqueValue',
  size: 25,
  to: '2023-02-23T06:59:59.999Z',
};
describe('group selector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('Sets runtime field and terms query', () => {
    const result = getGroupingQuery(testProps);

    expect(result.runtime_mappings.groupByField.script.params.selectedGroup).toEqual('host.name');

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

  const groupingAggs = {
    groupByFields: {
      buckets: [
        {
          ...groupingBucket,
          key: '20.80.64.28',
        },
        {
          ...groupingBucket,
          key: '0.0.0.0',
        },
        {
          ...groupingBucket,
          key: testProps.uniqueValue,
        },
      ],
    },
    unitsCount: {
      value: 100,
    },
    groupsCount: {
      value: 20,
    },
  };
  it('parseGroupingQuery finds and flags the null group', () => {
    const result = parseGroupingQuery('source.ip', testProps.uniqueValue, groupingAggs);
    expect(result).toEqual({
      groupByFields: {
        buckets: [
          {
            ...groupingBucket,
            key: ['20.80.64.28'],
            key_as_string: '20.80.64.28',
            selectedGroup: 'source.ip',
          },
          {
            ...groupingBucket,
            key: ['0.0.0.0'],
            key_as_string: '0.0.0.0',
            selectedGroup: 'source.ip',
          },
          {
            ...groupingBucket,
            key: [getEmptyValue()],
            key_as_string: getEmptyValue(),
            selectedGroup: 'source.ip',
            isNullGroup: true,
          },
        ],
      },
      unitsCount: {
        value: 100,
      },
      groupsCount: {
        value: 20,
      },
    });
  });
  it('parseGroupingQuery parses and formats fields witih multiple values', () => {
    const multiValuedAggs = {
      ...groupingAggs,
      groupByFields: {
        buckets: [
          {
            ...groupingBucket,
            key: `20.80.64.28${testProps.uniqueValue}0.0.0.0${testProps.uniqueValue}1.1.1.1`,
          },
          {
            ...groupingBucket,
            key: `0.0.0.0`,
          },
          {
            ...groupingBucket,
            key: `ip.with,comma${testProps.uniqueValue}ip.without.comma`,
          },
        ],
      },
    };
    const result: GroupingAggregation<{}> = parseGroupingQuery(
      'source.ip',
      testProps.uniqueValue,
      multiValuedAggs
    );

    expect(result).toEqual({
      groupByFields: {
        buckets: [
          {
            ...groupingBucket,
            key: ['20.80.64.28', '0.0.0.0', '1.1.1.1'],
            key_as_string: '20.80.64.28, 0.0.0.0, 1.1.1.1',
            selectedGroup: 'source.ip',
          },
          {
            ...groupingBucket,
            key: ['0.0.0.0'],
            key_as_string: '0.0.0.0',
            selectedGroup: 'source.ip',
          },
          {
            ...groupingBucket,
            key: ['ip.with,comma', 'ip.without.comma'],
            key_as_string: 'ip.with,comma, ip.without.comma',
            selectedGroup: 'source.ip',
          },
        ],
      },
      unitsCount: {
        value: 100,
      },
      groupsCount: {
        value: 20,
      },
    });
  });
});
