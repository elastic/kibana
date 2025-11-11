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
import { metricStateSchema } from './charts/metric';
import { legacyMetricStateSchema } from './charts/legacy_metric';
import { gaugeStateSchema } from './charts/gauge';
import { tagcloudStateSchema } from './charts/tagcloud';
import type { LensApiAllMetricOperations } from './metric_ops';
import type { LensApiBucketOperations } from './bucket_ops';

export const lensApiStateSchema = schema.oneOf([
  metricStateSchema,
  legacyMetricStateSchema,
  gaugeStateSchema,
  tagcloudStateSchema,
]);

export type LensApiState = TypeOf<typeof lensApiStateSchema>;

export type { MetricState, metricStateSchemaNoESQL } from './charts/metric';
export type { LegacyMetricState, legacyMetricStateSchemaNoESQL } from './charts/legacy_metric';
export type { GaugeState, gaugeStateSchemaNoESQL } from './charts/gauge';
export type { TagcloudState } from './charts/tagcloud';

export type NarrowByType<T, U> = T extends { type: U } ? T : never;

export type LensApiAllOperations = LensApiAllMetricOperations | LensApiBucketOperations;
