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
import { controlPanelsStateSchema } from '@kbn/controls-schemas';
import { refreshIntervalSchema } from '@kbn/data-service-server';
import { timeRangeSchema } from '@kbn/es-query-server';
import { classicTabSchema, esqlTabSchema } from '../embeddable/schema';

const MAX_DISCOVER_SESSION_TABS = 25;

const visContextRequestDataSchema = schema.object({
  data_view_id: schema.maybe(
    schema.string({
      meta: { description: 'Data view ID used when the chart was created.' },
    })
  ),
  time_field: schema.maybe(
    schema.string({
      meta: { description: 'Time field name used when the chart was created.' },
    })
  ),
  time_interval: schema.maybe(
    schema.string({
      meta: { description: 'Time interval used when the chart was created.' },
    })
  ),
  breakdown_field: schema.maybe(
    schema.string({
      meta: { description: 'Breakdown field name used when the chart was created.' },
    })
  ),
});

const visContextSchema = schema.oneOf([
  schema.object({
    suggestion_type: schema.string({
      meta: {
        description:
          'Lens suggestion type for the chart. Validated at the stable envelope level; inner Lens state is validated by the Lens embeddable transform registry.',
      },
    }),
    request_data: visContextRequestDataSchema,
    attributes: schema.recordOf(schema.string(), schema.any(), {
      meta: {
        description:
          'Opaque Lens visualization attributes. Validation is delegated to the Lens embeddable transform registry.',
      },
    }),
  }),
  schema.object(
    {},
    {
      meta: {
        description: 'Empty object indicating the chart has been cleared.',
      },
    }
  ),
]);

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
      meta: { description: 'Field used to break down chart series.' },
    })
  ),
  chart_interval: schema.maybe(
    schema.string({
      meta: { description: 'Time interval for the chart histogram.' },
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
  control_panels: schema.maybe(controlPanelsStateSchema),
});

const discoverSessionTabIdentitySchema = schema.object({
  id: schema.string({
    meta: { description: 'Unique identifier for the tab within the session.' },
  }),
  label: schema.string({
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
      meta: { description: 'A human-readable title for the Discover session.' },
    }),
    description: schema.string({
      defaultValue: '',
      meta: { description: 'A short description of the Discover session.' },
    }),
    chart_interval: schema.maybe(
      schema.string({
        meta: {
          description:
            'Default time interval for charts across tabs when a tab does not specify `chart_interval`.',
        },
      })
    ),
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
