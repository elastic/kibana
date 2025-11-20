/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Type } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { MetricState } from './charts/metric';
import { metricStateSchema } from './charts/metric';
import type { LegacyMetricState } from './charts/legacy_metric';
import { legacyMetricStateSchema } from './charts/legacy_metric';
import type { GaugeState } from './charts/gauge';
import { gaugeStateSchema } from './charts/gauge';
import type { LensApiAllMetricOperations } from './metric_ops';
import type { LensApiBucketOperations } from './bucket_ops';

/**
 * We need to break the type inference here to avoid exceeding the ts compiler serialization limit.
 *
 * This requires:
 *  - Casting the schema as any
 *  - Defining the `LensApiState` type from the schema types
 *  - Exporting this value as `Type<LensApiState>`
 */
export const _lensApiStateSchema: any = schema.oneOf([
  metricStateSchema,
  legacyMetricStateSchema,
  gaugeStateSchema,
]);

export type LensApiState = MetricState | LegacyMetricState | GaugeState;

export const lensApiStateSchema: Type<LensApiState> = _lensApiStateSchema;

export type { MetricState, metricStateSchemaNoESQL } from './charts/metric';
export type { LegacyMetricState, legacyMetricStateSchemaNoESQL } from './charts/legacy_metric';
export type { GaugeState, gaugeStateSchemaNoESQL } from './charts/gauge';

export type NarrowByType<T, U> = T extends { type: U } ? T : never;

export type LensApiAllOperations = LensApiAllMetricOperations | LensApiBucketOperations;
