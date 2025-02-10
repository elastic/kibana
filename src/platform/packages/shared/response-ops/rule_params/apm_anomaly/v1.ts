/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TypeOf, schema } from '@kbn/config-schema';
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
  serviceName: schema.maybe(schema.string()),
  transactionType: schema.maybe(schema.string()),
  windowSize: schema.number(),
  windowUnit: schema.string(),
  environment: schema.string(),
  anomalySeverityType: schema.oneOf([
    schema.literal(ML_ANOMALY_SEVERITY.CRITICAL),
    schema.literal(ML_ANOMALY_SEVERITY.MAJOR),
    schema.literal(ML_ANOMALY_SEVERITY.MINOR),
    schema.literal(ML_ANOMALY_SEVERITY.WARNING),
  ]),
  anomalyDetectorTypes: schema.maybe(schema.arrayOf(detectorsSchema, { minSize: 1 })),
});

export type AnomalyRuleParams = TypeOf<typeof anomalyParamsSchema>;
