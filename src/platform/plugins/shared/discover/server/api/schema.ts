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
  asCodeEsqlApproximationSchema,
  asCodeIdSchema,
  asCodeMetaSchema,
  asCodePaginationResponseMetaSchema,
  asCodeSearchRequestSchema,
  getAsCodeTagsSchema,
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
import {
  MAX_DISCOVER_SESSION_TABS,
  MAX_METRICS_TAB_DIMENSIONS,
  MAX_METRICS_TAB_STATE_STRING_LENGTH,
} from '@kbn/saved-search-plugin/common';
import {
  DiscoverTabType,
  METRICS_GRID_HISTOGRAM_PERCENTILES,
  METRICS_GRID_SIMPLE_AGGREGATIONS,
  UnifiedHistogramSuggestionType,
} from '@kbn/discover-utils';
import { classicTabSchema, esqlTabSchema } from '../embeddable/schema';

export const MAX_SESSION_TITLE_LENGTH = 256;
export const MAX_SESSION_DESCRIPTION_LENGTH = 1000;
export const MAX_TAB_LABEL_LENGTH = 120;
export const MAX_BREAKDOWN_FIELD_LENGTH = 1000;
export const MAX_VIS_CONTEXT_ATTRIBUTE_KEY_LENGTH = 256;
export const MAX_DISCOVER_SESSION_CONTROL_PANELS = 100;
export const MAX_DISCOVER_SESSION_TAGS = 1000;
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

export const discoverSessionControlPanelSchema = z
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
    time_range: timeRangeSchema.optional().meta({
      description:
        'Time range to restore when the tab is opened. When omitted, Discover uses the global time settings.',
    }),
    refresh_interval: refreshIntervalSchema.optional().meta({
      description:
        'Refresh interval associated with this tab. It can be stored independently; the presence of `time_range` controls whether the time settings are restored.',
    }),
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

const discoverSessionDefaultProfileSchema = z
  .object({
    type: z.literal(DiscoverTabType.Default).meta({
      description: 'Identifies a tab that uses the default Discover experience.',
    }),
  })
  .strict()
  .meta({
    title: 'Default profile',
    description: 'The standard Discover tab profile, which has no profile-specific state.',
  });

const simpleAggregationSchema = z.enum(METRICS_GRID_SIMPLE_AGGREGATIONS);

const histogramPercentileSchema = z.enum(METRICS_GRID_HISTOGRAM_PERCENTILES).meta({
  description: 'Percentile displayed for histogram metric fields.',
});

const discoverSessionMetricsProfileSchema = z
  .object({
    type: z.literal(DiscoverTabType.Metrics).meta({
      description: 'Identifies a tab that uses the Discover metrics experience.',
    }),
    dimensions: z
      .array(z.string().max(MAX_METRICS_TAB_STATE_STRING_LENGTH))
      .max(MAX_METRICS_TAB_DIMENSIONS)
      .meta({
        description: 'Fields used to group metrics in the metrics grid.',
      }),
    search_term: z.string().max(MAX_METRICS_TAB_STATE_STRING_LENGTH).meta({
      description: 'Search term used to filter metrics in the metrics grid.',
    }),
    counter_aggregation: simpleAggregationSchema.meta({
      description: 'Aggregation applied to counter metric fields.',
    }),
    gauge_aggregation: simpleAggregationSchema.meta({
      description: 'Aggregation applied to gauge metric fields.',
    }),
    histogram_percentile: histogramPercentileSchema,
  })
  .strict()
  .meta({
    title: 'Metrics profile',
    description: 'The Discover metrics profile and its persisted grid configuration.',
  });

export const discoverSessionProfileSchema = z
  .discriminatedUnion('type', [
    discoverSessionDefaultProfileSchema,
    discoverSessionMetricsProfileSchema,
  ])
  .meta({
    id: 'kbn-discover-session-profile',
    title: 'Discover session profile',
    description:
      'The profile used by the tab, including any profile-specific state. ' +
      'When omitted from a Discover session tab request, it defaults to the `default` profile and is always included in responses.',
  });

// Existing requests can omit the profile.
// When omitted, responses and transforms use the default profile.
const discoverSessionProfileWithDefaultSchema = discoverSessionProfileSchema.default({
  type: DiscoverTabType.Default,
});

const discoverSessionClassicTabSchema = z
  .object({
    ...discoverSessionTabIdentitySchema.shape,
    ...classicTabSchema.shape,
    ...discoverSessionTabPresentationSchema.shape,
    profile: discoverSessionProfileWithDefaultSchema,
  })
  .strict();

const discoverSessionEsqlTabSchema = z
  .object({
    ...discoverSessionTabIdentitySchema.shape,
    ...esqlTabSchema.shape,
    ...discoverSessionTabPresentationSchema.shape,
    ...asCodeEsqlApproximationSchema.shape,
    profile: discoverSessionProfileWithDefaultSchema,
  })
  .strict();

const discoverSessionApiTabSchema = z
  .union([discoverSessionClassicTabSchema, discoverSessionEsqlTabSchema])
  .meta({
    description:
      'A Discover tab definition. `data_source.type` selects the data source shape, while `profile.type` selects the Discover experience and its state.',
  });

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
    tags: getAsCodeTagsSchema(
      'Tag IDs to associate with this Discover session.',
      MAX_DISCOVER_SESSION_TAGS
    ).optional(),
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

export const discoverSessionApiResponseSchema = z
  .object({
    id: z.string().meta({ description: 'The Discover session ID.' }),
    data: discoverSessionApiDataSchema,
    meta: asCodeMetaSchema,
  })
  .strict();

/* Shared context for warnings produced while transforming a Discover session tab. */
const discoverSessionWarningBaseSchema = z.object({
  message: z.string().meta({ description: 'Why stored content was omitted from the response.' }),
  tab_id: z.string().meta({ description: 'The ID of the affected tab.' }),
});

/* Reports one invalid panel while allowing the other panels in the tab to be returned. */
const discoverSessionDroppedPanelWarningSchema = discoverSessionWarningBaseSchema
  .extend({
    type: z.literal('dropped_panel'),
    panel_id: z.string().meta({ description: 'The ID of the omitted control panel.' }),
  })
  .strict();

/* Reports a tab property that could not be returned as a whole. */
const discoverSessionDroppedPropertyWarningSchema = discoverSessionWarningBaseSchema
  .extend({
    type: z.literal('dropped_property'),
    key: z.string().meta({ description: 'The name of the property omitted from the response.' }),
  })
  .strict();

/* Allows GET responses to preserve valid session data while reporting what was dropped. */
export const discoverSessionWarningsSchema = z
  .array(
    z.union([discoverSessionDroppedPanelWarningSchema, discoverSessionDroppedPropertyWarningSchema])
  )
  .meta({
    description:
      'Warnings generated when stored Discover session content cannot be fully represented in the API response.',
  });

export const discoverSessionGetResponseSchema = discoverSessionApiResponseSchema.extend({
  warnings: discoverSessionWarningsSchema.optional(),
});

export const discoverSessionSanitizeResponseSchema = z
  .object({
    data: discoverSessionApiDataSchema,
    warnings: discoverSessionWarningsSchema.optional(),
  })
  .strict();

export const discoverSessionSearchParamsSchema = asCodeSearchRequestSchema.extend({
  query: z
    .string()
    .max(MAX_SEARCH_QUERY_LENGTH)
    .meta({
      description:
        'Full-text search (`simple_query_string`) over `title` and `description`. All terms must match.',
    })
    .optional(),
});

const discoverSessionSearchItemSchema = z
  .object({
    id: z.string().meta({ description: 'The Discover session ID.' }),
    data: z
      .object({
        title: z.string().meta({ description: 'Discover session title.' }),
        description: z.string().optional().meta({ description: 'Discover session description.' }),
        tags: getAsCodeTagsSchema(
          'Tag IDs associated with this Discover session.',
          MAX_DISCOVER_SESSION_TAGS
        ).optional(),
      })
      .strict(),
    meta: asCodeMetaSchema,
  })
  .strict();

export const discoverSessionSearchResponseSchema = z
  .object({
    data: z
      .array(discoverSessionSearchItemSchema)
      // Mirror the request's production-enforced `per_page` maximum in OAS and dev response validation.
      .max(PAGINATION_MAX_SIZE)
      .meta({
        description: 'List of matching Discover sessions (summaries, not the full session state).',
      }),
    meta: asCodePaginationResponseMetaSchema,
  })
  .strict();

export type DiscoverSessionApiData = z.output<typeof discoverSessionApiDataSchema>;
export type DiscoverSessionApiResponse = z.output<typeof discoverSessionApiResponseSchema>;
export type DiscoverSessionGetResponse = z.output<typeof discoverSessionGetResponseSchema>;
export type DiscoverSessionSanitizeResponse = z.output<
  typeof discoverSessionSanitizeResponseSchema
>;
export type DiscoverSessionWarning = z.output<typeof discoverSessionWarningsSchema>[number];
export type DiscoverSessionSearchParams = z.output<typeof discoverSessionSearchParamsSchema>;
export type DiscoverSessionSearchResponse = z.output<typeof discoverSessionSearchResponseSchema>;
export type DiscoverSessionApiClassicTab = z.output<typeof discoverSessionClassicTabSchema>;
export type DiscoverSessionApiEsqlTab = z.output<typeof discoverSessionEsqlTabSchema>;
export type DiscoverSessionApiTab = z.output<typeof discoverSessionApiTabSchema>;
export type DiscoverSessionApiProfile = z.output<typeof discoverSessionProfileSchema>;
export type DiscoverSessionControlPanels = z.output<typeof discoverSessionControlPanelsSchema>;

// Input types (shape accepted by the API, before defaults applied)
export type DiscoverSessionApiDataInput = z.input<typeof discoverSessionApiDataSchema>;
