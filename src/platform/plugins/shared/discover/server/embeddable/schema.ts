/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import {
  BY_REF_SCHEMA_META,
  BY_VALUE_SCHEMA_META,
  serializedTitlesSchema,
  serializedTimeRangeSchema,
} from '@kbn/presentation-publishing-schemas';
import type { GetDrilldownsSchemaFnType } from '@kbn/embeddable-plugin/server';
import { ON_OPEN_PANEL_MENU } from '@kbn/ui-actions-plugin/common/trigger_ids';
import {
  discoverSessionApiEmbeddableByValueConfigSchema,
  discoverSessionApiEmbeddableByReferenceConfigSchema,
} from '@kbn/as-code-discover-schema';

const DISCOVER_SUPPORTED_DRILLDOWN_TRIGGERS = [ON_OPEN_PANEL_MENU];

/**
 * Intersects embeddable-only props with panel-level schemas normally merged by the host
 * (e.g. dashboard): serialized titles, time range, and drilldowns.
 */
function withPanelSchemas<T extends z.ZodRawShape>(
  embeddableSchema: z.ZodObject<T>,
  allMeta: z.GlobalMeta = {}
) {
  return (getDrilldownsSchema: GetDrilldownsSchemaFnType) => {
    return z
      .object({
        ...serializedTitlesSchema.shape,
        ...serializedTimeRangeSchema.shape,
        ...getDrilldownsSchema(DISCOVER_SUPPORTED_DRILLDOWN_TRIGGERS).shape,
        ...embeddableSchema.shape,
      })
      .strip()
      .meta(allMeta);
  };
}

const getDiscoverSessionByValueEmbeddableSchema = withPanelSchemas(
  discoverSessionApiEmbeddableByValueConfigSchema,
  BY_VALUE_SCHEMA_META
);

const getDiscoverSessionByReferenceEmbeddableSchema = withPanelSchemas(
  discoverSessionApiEmbeddableByReferenceConfigSchema,
  BY_REF_SCHEMA_META
);

export const getDiscoverSessionEmbeddableSchema = (
  getDrilldownsSchema: GetDrilldownsSchemaFnType
) =>
  z.union([
    getDiscoverSessionByValueEmbeddableSchema(getDrilldownsSchema),
    getDiscoverSessionByReferenceEmbeddableSchema(getDrilldownsSchema),
  ]);

export type DiscoverSessionEmbeddableByValueState = z.output<
  ReturnType<typeof getDiscoverSessionByValueEmbeddableSchema>
>;
export type DiscoverSessionEmbeddableByReferenceState = z.output<
  ReturnType<typeof getDiscoverSessionByReferenceEmbeddableSchema>
>;
export type DiscoverSessionEmbeddableState = z.output<
  ReturnType<typeof getDiscoverSessionEmbeddableSchema>
>;
