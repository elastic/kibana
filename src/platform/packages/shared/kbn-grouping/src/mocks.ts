/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GroupingQueryArgs } from './containers/query/types';

export const groupingBucket = {
  key: '192.168.0.4',
  doc_count: 75,
  hostsCountAggregation: { value: 1 },
  rulesCountAggregation: { value: 32 },
  unitsCount: { value: 1920 },
  severitiesSubAggregation: {
    doc_count_error_upper_bound: 0,
    sum_other_doc_count: 0,
    buckets: [
      { key: 'critical', doc_count: 480 },
      { key: 'high', doc_count: 480 },
      { key: 'low', doc_count: 480 },
      { key: 'medium', doc_count: 480 },
    ],
  },
};

export const mocktestProps1: GroupingQueryArgs = {
  additionalFilters: [],
  timeRange: {
    from: '2022-12-28T15:35:32.871Z',
    to: '2023-02-23T06:59:59.999Z',
  },
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
};

export const mockTestProps2: GroupingQueryArgs = {
  additionalFilters: [],
  groupByField: 'resource.name',
  pageNumber: 0,
  rootAggregations: [
    {
      nullGroupItems: {
        missing: {
          field: 'resource.name',
        },
      },
    },
  ],
  runtimeMappings: {},
  size: 10,
  sort: [
    {
      groupByField: {
        order: 'desc',
      },
    },
  ],
  statsAggregations: [
    {
      groupByField: {
        cardinality: {
          field: 'resource.name',
        },
      },
      critical: {
        filter: {
          term: {
            'vulnerability.severity': {
              value: 'CRITICAL',
              case_insensitive: true,
            },
          },
        },
      },
      high: {
        filter: {
          term: {
            'vulnerability.severity': {
              value: 'HIGH',
              case_insensitive: true,
            },
          },
        },
      },
      medium: {
        filter: {
          term: {
            'vulnerability.severity': {
              value: 'MEDIUM',
              case_insensitive: true,
            },
          },
        },
      },
      low: {
        filter: {
          term: {
            'vulnerability.severity': {
              value: 'LOW',
              case_insensitive: true,
            },
          },
        },
      },
    },
    {
      resourceId: {
        terms: {
          field: 'resource.id',
          size: 1,
        },
      },
    },
  ],
  uniqueValue: 'whatAGreatAndUniqueValue',
  timeRange: {
    from: 'now-90d',
    to: 'now',
  },
};
