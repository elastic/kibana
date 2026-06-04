/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { metrics, ValueType } from '@opentelemetry/api';

// Get the meter ONCE, at module load, scoped to this plugin's area.
const meter = metrics.getMeter('kibana.otel_workshop');

/**
 * Orders currently being processed. Goes up when an order enters the pipeline and down when
 * it leaves — so it's an UpDownCounter. No attributes: the +1 and -1 must net to zero, which
 * means they'd have to carry identical attributes anyway.
 *
 * NOTE: the metric name passed here is the FULLY-QUALIFIED name. The meter scope is not
 * auto-prefixed onto it.
 */
export const activeOrders = meter.createUpDownCounter('kibana.otel_workshop.order.active', {
  description: 'Orders currently being processed in the pipeline.',
  unit: '1',
  valueType: ValueType.INT,
});

/**
 * How long each order took. A Histogram, because we care about the distribution (p50/p95/…),
 * sliced by the orthogonal `coffee.drink` and `outcome` dimensions.
 */
export const orderDuration = meter.createHistogram('kibana.otel_workshop.order.duration', {
  description: 'Time taken to prepare an order, by drink and outcome.',
  unit: 'ms',
  valueType: ValueType.DOUBLE,
});
