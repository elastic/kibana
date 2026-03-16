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
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';

/**
 * Configuration for the core rendering service's React rendering mode.
 * When true, the core rendering service uses `createRoot` (React 18 concurrent mode).
 * When false, it falls back to the legacy `ReactDOM.render`.
 * This only affects the core rendering service; individual plugins manage their own rendering.
 * Defaults to true.
 */
const configSchema = schema.boolean({ defaultValue: true });

export type IsCoreRenderingInReactConcurrentModeConfigType = TypeOf<typeof configSchema>;

export const isCoreRenderingInReactConcurrentModeConfig: ServiceConfigDescriptor<IsCoreRenderingInReactConcurrentModeConfigType> =
  {
    path: 'isCoreRenderingInReactConcurrentMode',
    schema: configSchema,
  };
