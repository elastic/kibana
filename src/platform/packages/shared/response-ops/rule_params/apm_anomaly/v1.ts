/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';

export enum AnomalyDetectorType {
  txLatency = 'txLatency',
  txThroughput = 'txThroughput',
  txFailureRate = 'txFailureRate',
}

const detectorsSchema = schema.oneOf([
  schema.literal(AnomalyDetectorType.txLatency),
  schema.literal(AnomalyDetectorType.txThroughput),
  schema.literal(AnomalyDetectorType.txFailureRate),
]);

export const anomalyParamsSchema = schema.object({
  serviceName: schema.maybe(schema.string({ meta: { description: 'The service name from APM.' } })),
  transactionType: schema.maybe(
    schema.string({ meta: { description: 'The transaction type from APM.' } })
  ),
  windowSize: schema.number({
    meta: {
      description:
        'The size of the time window (in `windowUnit` units), which determines how far back to search for documents. Generally it should be a value higher than the rule check interval to avoid gaps in detection.',
    },
  }),
  windowUnit: schema.string({
    meta: { description: 'The type of units for the time window: minutes, hours, or days.' },
  }),
  environment: schema.string({ meta: { description: 'The environment from APM.' } }),
  anomalySeverityType: schema.oneOf(
    [
      schema.literal(ML_ANOMALY_SEVERITY.CRITICAL),
      schema.literal(ML_ANOMALY_SEVERITY.MAJOR),
      schema.literal(ML_ANOMALY_SEVERITY.MINOR),
      schema.literal(ML_ANOMALY_SEVERITY.WARNING),
    ],
    {
      meta: {
        description:
          'The severity of anomalies that result in an alert: critical, major, minor, or warning.',
      },
    }
  ),
  anomalyDetectorTypes: schema.maybe(
    schema.arrayOf(detectorsSchema, {
      minSize: 1,
      meta: {
        description:
          'The types of anomalies that are detected. For example, detect abnormal latency, throughput, or failed transaction rates.',
      },
    })
  ),
});

export type AnomalyRuleParams = TypeOf<typeof anomalyParamsSchema>;
