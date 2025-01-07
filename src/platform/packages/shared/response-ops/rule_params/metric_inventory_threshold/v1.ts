/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, Type } from '@kbn/config-schema';
import { COMPARATORS } from '@kbn/alerting-comparators';

import {
  LEGACY_COMPARATORS,
  TimeUnitChar,
  oneOfLiterals,
  validateIsStringElasticsearchJSONFilter,
} from '../common/utils';

const SNAPSHOT_CUSTOM_AGGREGATIONS = ['avg', 'max', 'min', 'rate'] as const;
type SnapshotCustomAggregation = (typeof SNAPSHOT_CUSTOM_AGGREGATIONS)[number];

const SnapshotMetricTypeKeysArray = [
  'count',
  'cpuV2',
  'cpu',
  'diskLatency',
  'diskSpaceUsage',
  'load',
  'memory',
  'memoryFree',
  'memoryTotal',
  'normalizedLoad1m',
  'tx',
  'rx',
  'txV2',
  'rxV2',
  'logRate',
  'diskIOReadBytes',
  'diskIOWriteBytes',
  's3TotalRequests',
  's3NumberOfObjects',
  's3BucketSize',
  's3DownloadBytes',
  's3UploadBytes',
  'rdsConnections',
  'rdsQueriesExecuted',
  'rdsActiveTransactions',
  'rdsLatency',
  'sqsMessagesVisible',
  'sqsMessagesDelayed',
  'sqsMessagesSent',
  'sqsMessagesEmpty',
  'sqsOldestMessage',
  'custom',
];
type SnapshotMetricTypeKeys = (typeof SNAPSHOT_CUSTOM_AGGREGATIONS)[number];

const comparators = Object.values({ ...COMPARATORS, ...LEGACY_COMPARATORS });

export const metricInventoryThresholdRuleParamsSchema = schema.object(
  {
    criteria: schema.arrayOf(
      schema.object({
        threshold: schema.arrayOf(schema.number()),
        comparator: oneOfLiterals(comparators) as Type<COMPARATORS>,
        timeUnit: schema.string() as Type<TimeUnitChar>,
        timeSize: schema.number(),
        metric: oneOfLiterals(SnapshotMetricTypeKeysArray) as Type<SnapshotMetricTypeKeys>,
        warningThreshold: schema.maybe(schema.arrayOf(schema.number())),
        warningComparator: schema.maybe(oneOfLiterals(comparators)),
        customMetric: schema.maybe(
          schema.object({
            type: schema.literal('custom'),
            id: schema.string(),
            field: schema.string(),
            aggregation: oneOfLiterals(
              SNAPSHOT_CUSTOM_AGGREGATIONS
            ) as Type<SnapshotCustomAggregation>,
            label: schema.maybe(schema.string()),
          })
        ),
      })
    ),
    nodeType: schema.string(),
    filterQuery: schema.maybe(schema.string({ validate: validateIsStringElasticsearchJSONFilter })),
    sourceId: schema.string(),
    alertOnNoData: schema.maybe(schema.boolean()),
  },
  { unknowns: 'allow' }
);
