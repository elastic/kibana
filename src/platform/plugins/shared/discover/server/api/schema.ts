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
  asCodeIdSchema,
  asCodeMetaSchema,
  asCodePaginationParamsSchema,
  asCodePaginationResponseMetaSchema,
  PAGINATION_MAX_SIZE,
} from '@kbn/as-code-shared-schemas';
import { optionsListESQLControlSchema } from '@kbn/controls-schemas';
import {
  CONTROL_WIDTH_LARGE,
  CONTROL_WIDTH_MEDIUM,
  CONTROL_WIDTH_SMALL,
  DEFAULT_PINNED_CONTROL_STATE,
  ESQL_CONTROL,
} from '@kbn/controls-constants';
import { refreshIntervalSchema } from '@kbn/data-service-server';
import { timeRangeSchema } from '@kbn/es-query-server';
import { MAX_DISCOVER_SESSION_TABS } from '@kbn/saved-search-plugin/common';
import { UnifiedHistogramSuggestionType } from '@kbn/discover-utils';
import { classicTabSchema, esqlTabSchema } from '../embeddable/schema';

export const MAX_SESSION_TITLE_LENGTH = 256;
export const MAX_SESSION_DESCRIPTION_LENGTH = 1000;
export const MAX_TAB_LABEL_LENGTH = 120;
export const MAX_BREAKDOWN_FIELD_LENGTH = 1000;
export const MAX_VIS_CONTEXT_ATTRIBUTE_KEY_LENGTH = 256;
export const MAX_DISCOVER_SESSION_CONTROL_PANELS = 100;
export const MAX_SEARCH_QUERY_LENGTH = 1000;

const visContextSchema = z
  .object({
    suggestion_type: z
      .union([
        z.literal(UnifiedHistogramSuggestionType.lensSuggestion),
        z.literal(UnifiedHistogramSuggestionType.histogramForESQL),
        z.literal(UnifiedHistogramSuggestionType.histogramForDataView),
      ])
      .meta({
        description:
          'Chart suggestion type used by Discover to generate this histogram configuration.',
      }),
    attributes: z.record(z.string().max(MAX_VIS_CONTEXT_ATTRIBUTE_KEY_LENGTH), z.any()).meta({
      description: 'Chart configuration payload for the selected `suggestion_type`.',
    }),
  })
  .strict();

const discoverSessionControlWidthSchema = z
  .union([
    z.literal(CONTROL_WIDTH_SMALL),
    z.literal(CONTROL_WIDTH_MEDIUM),
    z.literal(CONTROL_WIDTH_LARGE),
  ])
  .default(DEFAULT_PINNED_CONTROL_STATE.width as typeof CONTROL_WIDTH_MEDIUM)
  .meta({
    description: 'Minimum width of the control panel.',
  });

const discoverSessionControlPanelSchema = z
  .object({
    id: z.string().min(1).meta({ description: 'The unique ID of the control.' }),
    type: z.literal(ESQL_CONTROL),
    width: discoverSessionControlWidthSchema,
    grow: z
      .boolean()
      .default(DEFAULT_PINNED_CONTROL_STATE.grow)
      .meta({
        description:
          'When `true`, the control expands to fill any available horizontal space. ' +
          'Defaults to `false`.',
      }),
    config: optionsListESQLControlSchema,
  })
  .strict()
  .meta({
    id: 'kbn-discover-session-api-esql-control-panel',
    title: ESQL_CONTROL,
    description:
      'An ES|QL variable control whose selected value is injected into Discover ES|QL ' +
      'queries using the `?variable_name` syntax.',
  });

export const discoverSessionControlPanelsSchema = z
  .array(discoverSessionControlPanelSchema)
  .max(MAX_DISCOVER_SESSION_CONTROL_PANELS)
  .default([])
  .refine(
    (panels) => new Set(panels.map((p) => p.id)).size === panels.length,
    'control_panels must have unique ids'
  )
  .meta({
    description: 'An array of Discover ES|QL control panels.',
  });

const discoverSessionTabPresentationSchema = z
  .object({
    hide_chart: z
      .boolean()
      .default(false)
      .meta({ description: 'When `true`, the chart is hidden.' }),
    hide_table: z
      .boolean()
      .default(false)
      .meta({ description: 'When `true`, the data table is hidden.' }),
    hide_aggregated_preview: z
      .boolean()
      .optional()
      .meta({ description: 'When `true`, aggregated preview panels are hidden.' }),
    breakdown_field: z
      .string()
      .max(MAX_BREAKDOWN_FIELD_LENGTH)
      .optional()
      .meta({ description: 'Field name used to split chart data into series.' }),
    chart_interval: z
      .union([
        z.literal('auto'),
        z.literal('ms'),
        z.literal('s'),
        z.literal('m'),
        z.literal('h'),
        z.literal('d'),
        z.literal('w'),
        z.literal('M'),
        z.literal('y'),
      ])
      .optional()
      .meta({
        description: 'Time interval for the chart histogram on this tab.',
      }),
    time_restore: z.boolean().default(false).meta({
      description:
        "When `true`, Discover applies this tab's `time_range` and `refresh_interval`. When `false`, those fields are ignored and global time settings are used.",
    }),
    time_range: timeRangeSchema.optional(),
    refresh_interval: refreshIntervalSchema.optional(),
    vis_context: visContextSchema.optional(),
    control_panels: discoverSessionControlPanelsSchema.optional(),
  })
  .strict();

const discoverSessionTabIdentitySchema = z
  .object({
    id: asCodeIdSchema,
    label: z.string().max(MAX_TAB_LABEL_LENGTH).meta({ description: 'Tab label.' }),
  })
  .strict();

const discoverSessionClassicTabSchema = z
  .object({
    ...discoverSessionTabIdentitySchema.shape,
    ...classicTabSchema.shape,
    ...discoverSessionTabPresentationSchema.shape,
  })
  .strict();

const discoverSessionEsqlTabSchema = z
  .object({
    ...discoverSessionTabIdentitySchema.shape,
    ...esqlTabSchema.shape,
    ...discoverSessionTabPresentationSchema.shape,
  })
  .strict();

const discoverSessionApiTabSchema = z.union([
  discoverSessionClassicTabSchema,
  discoverSessionEsqlTabSchema,
]);

export const discoverSessionApiDataSchema = z
  .object({
    title: z
      .string()
      .min(1)
      .max(MAX_SESSION_TITLE_LENGTH)
      .meta({ description: 'Discover session title.' }),
    description: z
      .string()
      .max(MAX_SESSION_DESCRIPTION_LENGTH)
      .default('')
      .meta({ description: 'Discover session description.' }),
    tabs: z
      .array(discoverSessionApiTabSchema)
      .min(1)
      .max(MAX_DISCOVER_SESSION_TABS)
      .refine(
        (tabs) => new Set(tabs.map((t) => t.id)).size === tabs.length,
        'tabs must have unique ids'
      )
      .meta({
        description:
          'Ordered list of tabs in the Discover session. Each tab requires a stable, unique ID because Dashboard panels and Discover links can reference it.',
      }),
  })
  .strict()
  .meta({
    id: 'kbn-discover-session-data',
    title: 'Discover session data',
    description: 'Configuration data for a Discover session.',
  });

export const discoverSessionApiResponseSchema = z.object({
  id: z.string().meta({ description: 'The Discover session ID.' }),
  data: discoverSessionApiDataSchema,
  meta: asCodeMetaSchema,
});

export const discoverSessionSearchParamsSchema = asCodePaginationParamsSchema.extend({
  query: z
    .string()
    .max(MAX_SEARCH_QUERY_LENGTH)
    .meta({
      description:
        'Full-text search (`simple_query_string`) over `title` and `description`. All terms must match.',
    })
    .optional(),
});

const discoverSessionSearchItemSchema = z.object({
  id: z.string().meta({ description: 'The Discover session ID.' }),
  data: z.object({
    title: z.string().meta({ description: 'Discover session title.' }),
    description: z.string().optional().meta({ description: 'Discover session description.' }),
  }),
  meta: asCodeMetaSchema,
});

export const discoverSessionSearchResponseSchema = z.object({
  data: z
    .array(discoverSessionSearchItemSchema)
    // Mirror the request's production-enforced `per_page` maximum in OAS and dev response validation.
    .max(PAGINATION_MAX_SIZE)
    .meta({
      description: 'List of matching Discover sessions (summaries, not the full session state).',
    }),
  meta: asCodePaginationResponseMetaSchema,
});

export type DiscoverSessionApiData = z.output<typeof discoverSessionApiDataSchema>;
export type DiscoverSessionApiResponse = z.output<typeof discoverSessionApiResponseSchema>;
export type DiscoverSessionSearchParams = z.output<typeof discoverSessionSearchParamsSchema>;
export type DiscoverSessionSearchResponse = z.output<typeof discoverSessionSearchResponseSchema>;
export type DiscoverSessionApiClassicTab = z.output<typeof discoverSessionClassicTabSchema>;
export type DiscoverSessionApiEsqlTab = z.output<typeof discoverSessionEsqlTabSchema>;
export type DiscoverSessionApiTab = z.output<typeof discoverSessionApiTabSchema>;
export type DiscoverSessionControlPanels = z.output<typeof discoverSessionControlPanelsSchema>;
