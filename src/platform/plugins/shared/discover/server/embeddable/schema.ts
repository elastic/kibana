/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { DataGridDensity } from '@kbn/discover-utils';
import { asCodeQuerySchema } from '@kbn/as-code-shared-schemas';
import { dataViewSchema, esqlDataSourceSchema } from '@kbn/as-code-data-views-schema';
import {
  BY_REF_SCHEMA_META,
  BY_VALUE_SCHEMA_META,
  serializedTitlesSchema,
  serializedTimeRangeSchema,
} from '@kbn/presentation-publishing-schemas';
import { VIEW_MODE } from '@kbn/saved-search-plugin/common';
import { asCodeFilterSchema } from '@kbn/as-code-filters-schema';
import type { GetDrilldownsSchemaFnType } from '@kbn/embeddable-plugin/server';
import { ON_OPEN_PANEL_MENU } from '@kbn/ui-actions-plugin/common/trigger_ids';

const columnSettingsEntrySchema = z.object({
  width: z
    .number()
    .min(0)
    .meta({
      description: 'Optional width of the column in pixels.',
    })
    .optional(),
});

const sortSchema = z.object({
  name: z.string().meta({
    description: 'The name of the field to sort by.',
  }),
  direction: z.union([z.literal('asc'), z.literal('desc')]).meta({
    description:
      'The direction to sort the field by: Use "asc" for ascending or "desc" for descending.',
  }),
});

export const viewModeSchema = z
  .union([
    z.literal(VIEW_MODE.DOCUMENT_LEVEL),
    z.literal(VIEW_MODE.PATTERN_LEVEL),
    z.literal(VIEW_MODE.AGGREGATED_LEVEL),
  ])
  .default(VIEW_MODE.DOCUMENT_LEVEL)
  .meta({
    description:
      'Discover view mode. Choose "documents" (search hits), "patterns" (pattern analysis), or "aggregated" (field statistics).',
  });

const dataTableLimitsSchema = z
  .object({
    rows_per_page: z
      .number()
      .min(1)
      .max(10000)
      .default(100)
      .meta({
        description:
          'The number of rows to display per page in the data table. If omitted, defaults to the advanced setting "discover:sampleRowsPerPage".',
      })
      .optional(),
    sample_size: z
      .number()
      .min(10)
      .max(10000)
      .default(500)
      .meta({
        description:
          'The number of documents to sample for the data table. If omitted, defaults to the advanced setting "discover:sampleSize".',
      })
      .optional(),
  })
  .meta({ id: 'discoverSessionEmbeddableDataTableLimitsSchema' });

const dataTableSchema = z
  .object({
    column_order: z
      .array(
        z.string().meta({
          description: 'Field name of a column in display order.',
        })
      )
      .max(100)
      .default([])
      .meta({
        description:
          'Ordered list of field names to display in the data table. If omitted, defaults to the advanced setting "defaultColumns" or the referenced saved object.',
      })
      .optional(),
    column_settings: z
      .record(z.string(), columnSettingsEntrySchema)
      .meta({
        description:
          'Per-column presentation settings keyed by field name (e.g. widths). Keys should correspond to entries in `column_order` when both are set.',
      })
      .optional(),
    sort: z.array(sortSchema).max(100).default([]).meta({
      description: 'Sort configuration for the data table (field and direction).',
    }),
    density: z
      .union([
        z.literal(DataGridDensity.COMPACT),
        z.literal(DataGridDensity.EXPANDED),
        z.literal(DataGridDensity.NORMAL),
      ])
      .default(DataGridDensity.COMPACT)
      .meta({
        description:
          'Data grid density. Choose "compact", "expanded", or "normal" for row spacing. If omitted, defaults to Discover or embeddable defaults (e.g. user preference / local storage).',
      })
      .optional(),
    header_row_height: z
      .union([z.number().min(1).max(5), z.literal('auto')])
      .default(3)
      .meta({
        description:
          'Header row height. Use a number (1–5) or "auto" to size based on content. If omitted, defaults to Discover or embeddable defaults (e.g. user preference / local storage).',
      })
      .optional(),
    row_height: z
      .union([z.number().min(1).max(20), z.literal('auto')])
      .default(3)
      .meta({
        description:
          'Data row height. Use a number (1–20) or "auto" to size based on content. If omitted, defaults to the advanced setting "discover:rowHeightOption".',
      })
      .optional(),
  })
  .meta({ id: 'discoverSessionEmbeddableDataTableSchema' });

const panelOverridesSchema = z
  .object({
    column_order: z
      .array(
        z.string().meta({
          description: 'Field name of a column in display order.',
        })
      )
      .max(100)
      .default([])
      .meta({
        description:
          'When set, overrides column order for the data table relative to the referenced saved object (`ref_id`) or the inline tab in `tabs`. If omitted, the source configuration is used.',
      })
      .optional(),
    column_settings: z
      .record(z.string(), columnSettingsEntrySchema)
      .meta({
        description:
          'Per-column presentation overrides (e.g. widths) keyed by field name. When set, merges with the source configuration for the referenced session or inline tab.',
      })
      .optional(),
    sort: z
      .array(sortSchema)
      .max(100)
      .default([])
      .meta({
        description:
          'Sort configuration (field and direction) for the data table. When set, overrides the referenced saved object or the inline tab config in `tabs`. If omitted, the source configuration is used.',
      })
      .optional(),
    density: z
      .union([
        z.literal(DataGridDensity.COMPACT),
        z.literal(DataGridDensity.EXPANDED),
        z.literal(DataGridDensity.NORMAL),
      ])
      .default(DataGridDensity.COMPACT)
      .meta({
        description:
          'Data grid row spacing: `compact`, `expanded`, or `normal`. When set, overrides the referenced saved object or the inline tab config in `tabs`. If omitted, the source configuration is used.',
      })
      .optional(),
    header_row_height: z
      .union([z.number().min(1).max(5), z.literal('auto')])
      .default(3)
      .meta({
        description:
          'Header row height: number (1–5) or `auto`. When set, overrides the referenced saved object or the inline tab config in `tabs`. If omitted, the source configuration is used.',
      })
      .optional(),
    row_height: z
      .union([z.number().min(1).max(20), z.literal('auto')])
      .default(3)
      .meta({
        description:
          'Data row height: number (1–20) or `auto`. When set, overrides the referenced saved object or the inline tab config in `tabs`. If omitted, falls back to the source or to the advanced setting "discover:rowHeightOption".',
      })
      .optional(),
    rows_per_page: z
      .number()
      .min(1)
      .max(10000)
      .default(100)
      .meta({
        description:
          'Number of rows per page. When set, overrides the referenced saved object or the inline tab config in `tabs`. If omitted, falls back to the source or to the advanced setting "discover:sampleRowsPerPage".',
      })
      .optional(),
    sample_size: z
      .number()
      .min(10)
      .max(10000)
      .default(500)
      .meta({
        description:
          'Number of documents to sample. When set, overrides the referenced saved object or the inline tab config in `tabs`. If omitted, falls back to the source or to the advanced setting "discover:sampleSize".',
      })
      .optional(),
  })
  .default({});

const classicTabSchema = z.object({
  ...dataTableSchema.shape,
  ...dataTableLimitsSchema.shape,
  query: asCodeQuerySchema.optional(),
  filters: z.array(asCodeFilterSchema).max(100).default([]).meta({
    description: 'List of filters to apply to the data in the tab.',
  }),
  data_source: dataViewSchema,
  view_mode: viewModeSchema,
});

const esqlTabSchema = dataTableSchema
  .extend({
    data_source: esqlDataSourceSchema,
  })
  .meta({
    description: 'ES|QL (Elasticsearch Query Language) data source.',
  });

const tabSchema = z.union([classicTabSchema, esqlTabSchema]);

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
      .meta(allMeta);
  };
}

const discoverSessionByValuePropsSchema = z.object({
  tabs: z.array(tabSchema).min(1).max(1).meta({
    description:
      'Inline tab configuration. Used when no `ref_id` is set. Currently supports one tab.',
  }),
});
const getDiscoverSessionByValueEmbeddableSchema = withPanelSchemas(
  discoverSessionByValuePropsSchema,
  BY_VALUE_SCHEMA_META
);

const discoverSessionByReferencePropsSchema = z.object({
  ref_id: z.string(),
  selected_tab_id: z
    .string()
    .meta({
      description:
        'Tab to select from the referenced saved object. If omitted, defaults to the first tab.',
    })
    .optional(),
  overrides: panelOverridesSchema,
});
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
