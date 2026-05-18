/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { metrics, ValueType } from '@opentelemetry/api';

const meter = metrics.getMeter('kibana.esql');

export const esqlRouteRequestCounter = meter.createCounter('kibana.esql.route.request.count', {
  description: 'Count of Kibana ES|QL route requests with outcome and status code',
  unit: '{request}',
  valueType: ValueType.INT,
});

export const getErrorStatusCode = (error: unknown): number => {
  const err = error as { statusCode?: number; meta?: { statusCode?: number } } | null;
  return err?.statusCode ?? err?.meta?.statusCode ?? 500;
};
