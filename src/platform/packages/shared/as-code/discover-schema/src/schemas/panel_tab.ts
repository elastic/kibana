/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { classicTabSchema, esqlTabSchema } from './tab';
import { discoverSessionMetricsTabTypeStateSchema } from './metrics_tab';
import { discoverSessionDefaultTabTypeStateSchema } from './session_data';

const panelMetricsTabSchema = esqlTabSchema
  .extend(discoverSessionMetricsTabTypeStateSchema.shape)
  .meta({
    title: 'Metrics tab',
    description:
      'An ES|QL tab with saved metrics grid settings. ' +
      'The dashboard panel stores these settings and restores them in Discover. ' +
      'The panel does not render the metrics grid.',
  });

/**
 * Inline tab configuration for a by-value Discover panel. Unlike the session API tab schemas, it
 * omits session-only fields such as id, label, and presentation state.
 */
export const panelTabSchema = z.union([
  classicTabSchema.extend(discoverSessionDefaultTabTypeStateSchema.shape),
  esqlTabSchema
    .extend(discoverSessionDefaultTabTypeStateSchema.shape)
    .meta({ ...esqlTabSchema.meta() }), // extend() does not preserve object-level metadata.
  panelMetricsTabSchema,
]);
