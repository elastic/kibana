/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import dedent from 'dedent';
import { getGroupingQuery, MAX_RUNTIME_FIELD_SIZE, parseGroupingQuery } from '.';
import { getEmptyValue } from './helpers';
import type { GroupingAggregation } from '../../..';
import { groupingBucket, mocktestProps1, mockTestProps2 } from '../../mocks';

describe('group selector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getGroupingQuery', () => {
    it('Sets runtime field and terms query', () => {
      const result = getGroupingQuery(mocktestProps1);

      expect(result.runtime_mappings.groupByField.script.params.selectedGroup).toEqual('host.name');

      expect(result.aggs.groupByFields.aggs).toEqual({
        bucket_truncate: { bucket_sort: { from: 0, size: 25 } },
        alertsCount: { cardinality: { field: 'kibana.alert.uuid' } },
        rulesCountAggregation: { cardinality: { field: 'kibana.alert.rule.rule_id' } },
        severitiesSubAggregation: { terms: { field: 'kibana.alert.severity' } },
        usersCountAggregation: { cardinality: { field: 'user.name' } },
      });
      expect(result.aggs.alertsCount).toBeUndefined();
      expect(result.aggs.groupsNumber).toBeUndefined();
      expect(result.query.bool.filter.length).toEqual(1);
    });

    it('Sets additional rootAggregations', () => {
      const result = getGroupingQuery({
        ...mocktestProps1,
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
        ...mocktestProps1,
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

    it('groupByField script should contain logic which gets all values of groupByField', () => {
      const scriptResponse = {
        source: dedent(`
          def groupValues = [];
          if (doc.containsKey(params['selectedGroup']) && !doc[params['selectedGroup']].empty) {
            groupValues = doc[params['selectedGroup']];
          }  
          int count = groupValues.size();
          if (count == 0 || count > ${MAX_RUNTIME_FIELD_SIZE} ) { emit(params['uniqueValue']); }
          else {
            emit(groupValues.join(params['uniqueValue']));
          }`),
        params: {
          selectedGroup: 'resource.name',
          uniqueValue: 'whatAGreatAndUniqueValue',
        },
      };

      const result = getGroupingQuery(mockTestProps2);

      expect(result.runtime_mappings.groupByField.script).toEqual(scriptResponse);
      expect(result.runtime_mappings.groupByField.script.params).toEqual(scriptResponse.params);
      expect(result.aggs.unitsCount).toEqual({ value_count: { field: 'groupByField' } });
    });

    it('groupByField script should flatten documents in runtime by groupByField', () => {
      const groupByField = 'resource.name';
      const countByKeyForMultiValueFields = 'event.id';

      const scriptResponse = {
        source: dedent(`
          def groupValues = [];
          if (doc.containsKey(params['selectedGroup']) && !doc[params['selectedGroup']].empty) {
            groupValues = doc[params['selectedGroup']];
          }  
          int count = groupValues.size();
          if (count == 0 || count > ${MAX_RUNTIME_FIELD_SIZE} ) { emit(params['uniqueValue']); }
          else {
            for (int i = 0; i < count && i < ${MAX_RUNTIME_FIELD_SIZE}; i++) { emit(groupValues[i]); }
          }`),
        params: {
          selectedGroup: groupByField,
          uniqueValue: 'whatAGreatAndUniqueValue',
        },
      };

      const result = getGroupingQuery({
        ...mockTestProps2,
        multiValueFieldsToFlatten: [groupByField],
        countByKeyForMultiValueFields: 'event.id',
      });

      expect(result.runtime_mappings.groupByField.script).toEqual(scriptResponse);
      expect(result.aggs.unitsCount).toEqual({
        value_count: { field: countByKeyForMultiValueFields },
      });
    });
  });

  describe('parseGroupingQuery', () => {
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
            key: mocktestProps1.uniqueValue,
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
      const result = parseGroupingQuery('source.ip', mocktestProps1.uniqueValue, groupingAggs);
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
              key: `20.80.64.28${mocktestProps1.uniqueValue}0.0.0.0${mocktestProps1.uniqueValue}1.1.1.1`,
            },
            {
              ...groupingBucket,
              key: `0.0.0.0`,
            },
            {
              ...groupingBucket,
              key: `ip.with,comma${mocktestProps1.uniqueValue}ip.without.comma`,
            },
          ],
        },
      };
      const result: GroupingAggregation<{}> = parseGroupingQuery(
        'source.ip',
        mocktestProps1.uniqueValue,
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
});
