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
import { asCodeIdSchema, asCodeMetaSchema } from '@kbn/as-code-shared-schemas';
import { getControlsGroupSchema } from '@kbn/controls-schemas';
import { refreshIntervalSchema } from '@kbn/data-service-server';
import { timeRangeSchema } from '@kbn/es-query-server';
import { MAX_DISCOVER_SESSION_TABS } from '@kbn/saved-search-plugin/common';
import { UnifiedHistogramSuggestionType } from '@kbn/discover-utils';
import { classicTabSchema, esqlTabSchema } from '../embeddable/schema';

const MAX_SESSION_TITLE_LENGTH = 256;
const MAX_SESSION_DESCRIPTION_LENGTH = 2000;
const MAX_TAB_LABEL_LENGTH = 120;
const MAX_CHART_INTERVAL_LENGTH = 64;
const MAX_BREAKDOWN_FIELD_LENGTH = 1000;
const MAX_VIS_CONTEXT_ATTRIBUTE_KEY_LENGTH = 256;

const visContextSchema = schema.object({
  suggestion_type: schema.oneOf(
    [
      schema.literal(UnifiedHistogramSuggestionType.lensSuggestion),
      schema.literal(UnifiedHistogramSuggestionType.histogramForESQL),
      schema.literal(UnifiedHistogramSuggestionType.histogramForDataView),
    ],
    {
      meta: {
        description:
          'Discover histogram suggestion path that produced the chart. Inner Lens state is validated by the Lens embeddable transform registry.',
      },
    }
  ),
  attributes: schema.recordOf(
    schema.string({ maxLength: MAX_VIS_CONTEXT_ATTRIBUTE_KEY_LENGTH }),
    schema.any(),
    {
      meta: {
        description:
          'Opaque Lens visualization attributes. Validation is delegated to the Lens embeddable transform registry. Chart request metadata (data view, time field, breakdown field, interval) is inferred from the tab `data_source`, `breakdown_field`, and `chart_interval` when applying this context at runtime.',
      },
    }
  ),
});

const discoverSessionTabPresentationSchema = schema.object({
  hide_chart: schema.boolean({
    defaultValue: false,
    meta: { description: 'When `true`, the chart is hidden. Defaults to `false`.' },
  }),
  hide_table: schema.boolean({
    defaultValue: false,
    meta: { description: 'When `true`, the data table is hidden. Defaults to `false`.' },
  }),
  hide_aggregated_preview: schema.maybe(
    schema.boolean({
      meta: { description: 'When `true`, the aggregated preview is hidden.' },
    })
  ),
  breakdown_field: schema.maybe(
    schema.string({
      maxLength: MAX_BREAKDOWN_FIELD_LENGTH,
      meta: { description: 'Field used to break down chart series.' },
    })
  ),
  chart_interval: schema.maybe(
    schema.string({
      maxLength: MAX_CHART_INTERVAL_LENGTH,
      meta: {
        description: 'Time interval for the chart histogram on this tab.',
      },
    })
  ),
  time_restore: schema.boolean({
    defaultValue: false,
    meta: {
      description:
        'When `true`, the tab stores its own `time_range` and `refresh_interval` instead of using the global timepicker. Defaults to `false`.',
    },
  }),
  time_range: schema.maybe(timeRangeSchema),
  refresh_interval: schema.maybe(refreshIntervalSchema),
  vis_context: schema.maybe(visContextSchema),
  control_panels: schema.maybe(getControlsGroupSchema()),
});

const discoverSessionTabIdentitySchema = schema.object({
  id: asCodeIdSchema,
  label: schema.string({
    maxLength: MAX_TAB_LABEL_LENGTH,
    meta: { description: 'Human-readable label displayed on the tab.' },
  }),
});

const discoverSessionClassicTabSchema = schema.object({
  ...discoverSessionTabIdentitySchema.getPropSchemas(),
  ...classicTabSchema.getPropSchemas(),
  ...discoverSessionTabPresentationSchema.getPropSchemas(),
});

const discoverSessionEsqlTabSchema = schema.object({
  ...discoverSessionTabIdentitySchema.getPropSchemas(),
  ...esqlTabSchema.getPropSchemas(),
  ...discoverSessionTabPresentationSchema.getPropSchemas(),
});

const discoverSessionApiTabSchema = schema.oneOf([
  discoverSessionClassicTabSchema,
  discoverSessionEsqlTabSchema,
]);

export const discoverSessionDataSchema = schema.object(
  {
    title: schema.string({
      minLength: 1,
      maxLength: MAX_SESSION_TITLE_LENGTH,
      meta: { description: 'A human-readable title for the Discover session.' },
    }),
    description: schema.string({
      defaultValue: '',
      maxLength: MAX_SESSION_DESCRIPTION_LENGTH,
      meta: { description: 'A short description of the Discover session.' },
    }),
    tabs: schema.arrayOf(discoverSessionApiTabSchema, {
      minSize: 1,
      maxSize: MAX_DISCOVER_SESSION_TABS,
      meta: {
        description:
          'Tabs in the Discover session. Each tab is either a classic data view tab or an ES|QL tab, discriminated by `data_source.type`.',
      },
    }),
  },
  {
    meta: {
      id: 'kbn-discover-session-data',
      title: 'Discover session data',
      description: 'User-defined configuration for a Discover session.',
    },
  }
);

export const discoverSessionApiResponseSchema = schema.object({
  id: asCodeIdSchema,
  data: discoverSessionDataSchema,
  meta: asCodeMetaSchema,
});

export const discoverSessionApiRequestBodySchema = schema.object({
  data: discoverSessionDataSchema,
});

export type DiscoverSessionData = TypeOf<typeof discoverSessionDataSchema>;
export type DiscoverSessionApiResponse = TypeOf<typeof discoverSessionApiResponseSchema>;
export type DiscoverSessionApiClassicTab = TypeOf<typeof discoverSessionClassicTabSchema>;
export type DiscoverSessionApiEsqlTab = TypeOf<typeof discoverSessionEsqlTabSchema>;
export type DiscoverSessionApiTab = TypeOf<typeof discoverSessionApiTabSchema>;
