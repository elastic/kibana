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
import type { tabSchema } from '@kbn/as-code-discover-schema';
import {
  classicTabSchema,
  esqlTabSchema,
  panelOverridesSchema,
  discoverSessionDefaultTabTypeStateSchema,
  discoverSessionMetricsTabTypeStateSchema,
} from '@kbn/as-code-discover-schema';

const metricsTabSchema = esqlTabSchema.extend(discoverSessionMetricsTabTypeStateSchema.shape).meta({
  title: 'Metrics tab',
  description:
    'An ES|QL tab with saved metrics grid settings. ' +
    'The dashboard panel stores these settings and restores them in Discover. ' +
    'The panel does not render the metrics grid.',
});

// Panel tabs reuse the shared base schemas, not the full session API schemas,
// which also include session-only fields such as id, label, and presentation state.
const byValueTabSchema = z.union([
  classicTabSchema.extend(discoverSessionDefaultTabTypeStateSchema.shape),
  esqlTabSchema
    .extend(discoverSessionDefaultTabTypeStateSchema.shape)
    .meta({ ...esqlTabSchema.meta() }), // extend() does not preserve object-level metadata.
  metricsTabSchema,
]);

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

const discoverSessionByValuePropsSchema = z
  .object({
    tabs: z.array(byValueTabSchema).min(1).max(1).meta({
      description:
        'Inline tab configuration. Used when no `ref_id` is set. Currently supports one tab.',
    }),
  })
  .strict();
const getDiscoverSessionByValueEmbeddableSchema = withPanelSchemas(
  discoverSessionByValuePropsSchema,
  BY_VALUE_SCHEMA_META
);

const discoverSessionByReferencePropsSchema = z
  .object({
    ref_id: z.string(),
    selected_tab_id: z.string().optional().meta({
      description:
        'Tab to select from the referenced saved object. If omitted, defaults to the first tab.',
    }),
    overrides: panelOverridesSchema,
  })
  .strict();
const getDiscoverSessionByReferenceEmbeddableSchema = withPanelSchemas(
  discoverSessionByReferencePropsSchema,
  BY_REF_SCHEMA_META
);

export const getDiscoverSessionEmbeddableSchema = (
  getDrilldownsSchema: GetDrilldownsSchemaFnType
) =>
  z.union([
    getDiscoverSessionByValueEmbeddableSchema(getDrilldownsSchema),
    getDiscoverSessionByReferenceEmbeddableSchema(getDrilldownsSchema),
  ]);

export type DiscoverSessionPanelOverrides = z.output<typeof panelOverridesSchema>;
export type DiscoverSessionClassicTab = z.output<typeof classicTabSchema>;
export type DiscoverSessionEsqlTab = z.output<typeof esqlTabSchema>;
export type DiscoverSessionTab = z.output<typeof tabSchema>;
export type DiscoverSessionEmbeddableByValueProps = z.output<
  typeof discoverSessionByValuePropsSchema
>;
export type DiscoverSessionEmbeddableByReferenceProps = z.output<
  typeof discoverSessionByReferencePropsSchema
>;

export type DiscoverSessionEmbeddableByValueState = z.output<
  ReturnType<typeof getDiscoverSessionByValueEmbeddableSchema>
>;
export type DiscoverSessionEmbeddableByReferenceState = z.output<
  ReturnType<typeof getDiscoverSessionByReferenceEmbeddableSchema>
>;
export type DiscoverSessionEmbeddableState = z.output<
  ReturnType<typeof getDiscoverSessionEmbeddableSchema>
>;

// Input types (shape accepted before defaults are applied)
export type DiscoverSessionEmbeddableByValueStateInput = z.input<
  ReturnType<typeof getDiscoverSessionByValueEmbeddableSchema>
>;
export type DiscoverSessionEmbeddableByReferenceStateInput = z.input<
  ReturnType<typeof getDiscoverSessionByReferenceEmbeddableSchema>
>;
export type DiscoverSessionEmbeddableStateInput = z.input<
  ReturnType<typeof getDiscoverSessionEmbeddableSchema>
>;
