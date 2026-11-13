/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asCodeFilterSchema } from '@kbn/as-code-filters-schema';
import {
  asCodeEsqlApproximationSchema,
  asCodeQuerySchema,
  getAsCodeTagsSchema,
} from '@kbn/as-code-shared-schemas';
import {
  DEFAULT_PINNED_CONTROL_STATE,
  ESQL_CONTROL,
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
  TIME_SLIDER_CONTROL,
} from '@kbn/controls-constants';
import { getControlsGroupSchema } from '@kbn/controls-schemas';
import { refreshIntervalSchema } from '@kbn/data-service-server';
import { timeRangeSchema } from '@kbn/es-query-server';
import { z } from '@kbn/zod';
import { MAX_PANELS } from '../constants';
import { accessControlSchema } from './access_control';
import { basePanelSchema } from './base_panel';
import { optionsSchema } from './options';
import { getSectionSchema } from './section';

/** Creates a discriminated union schema for dashboard panels based on registered embeddable schemas. */
export function getPanelSchema(
  embeddableSchemas: Record<string, { schema: z.ZodType<Record<string, unknown>>; title: string }>
) {
  const panelSchemas = Object.entries(embeddableSchemas)
    // sort to ensure consistent order in OAS documentation
    .sort(([, { title: aTitle }], [, { title: bTitle }]) => aTitle.localeCompare(bTitle))
    .map(([type, { schema: configSchema, title }]) =>
      basePanelSchema
        .extend({
          type: z.literal(type),
          // TODO: enforce Serializable type, see https://github.com/elastic/kibana/pull/269196
          config: configSchema as z.ZodType<{}>,
        })
        .strict()
        .meta({
          id: `kbn-dashboard-panel-type-${type}`,
          title,
        })
    );

  type PanelSchema = (typeof panelSchemas)[number];
  return z.discriminatedUnion('type', panelSchemas as [PanelSchema, ...PanelSchema[]]);
}

/** Creates a discriminated union schema for pinned dashboard panels based on pinnable panel types */
export function getPinnedPanelSchema(
  embeddableSchemas: Record<string, { schema: z.ZodType<Record<string, unknown>>; title: string }>
) {
  const panelSchemas = Object.entries(embeddableSchemas)
    .filter(([type]) => {
      return [
        OPTIONS_LIST_CONTROL,
        RANGE_SLIDER_CONTROL,
        ESQL_CONTROL,
        TIME_SLIDER_CONTROL,
        'links',
      ].includes(type);
    })
    // sort to ensure consistent order in OAS documentation
    .sort(([, { title: aTitle }], [, { title: bTitle }]) => aTitle.localeCompare(bTitle))
    .map(([type, { schema: configSchema, title }]) =>
      basePanelSchema
        .extend({
          type: z.literal(type),
          // TODO: enforce Serializable type, see https://github.com/elastic/kibana/pull/269196
          config: configSchema as z.ZodType<{}>,
        })
        .strict()
        .meta({
          id: `kbn-dashboard-pinned-panel-type-${type}`,
          title,
        })
    );

  type PanelSchema = (typeof panelSchemas)[number];
  return z.discriminatedUnion('type', panelSchemas as [PanelSchema, ...PanelSchema[]]);
}

export const pinnedPanelSchema = z
  .object({
    id: z.string().optional().meta({ description: 'The unique ID of the control' }),
    width: z.number(),
    grow: z.boolean().default(DEFAULT_PINNED_CONTROL_STATE.grow).meta({
      description:
        'When `true`, the control expands to fill any available horizontal space. Defaults to `false`.',
    }),
  })
  .strict();

/** Creates a full dashboard state schema, accepting runtime dependencies as parameters. */
export function getDashboardDataSchema<P extends z.ZodTypeAny>(
  embeddableSchemas: Record<string, { schema: z.ZodType<Record<string, unknown>>; title: string }>,
  options?: { isDashboardAppRequest?: boolean; isReadRequest?: boolean }
) {
  const pinnedPanelsSchema = getPinnedPanelSchema(embeddableSchemas);

  const { isDashboardAppRequest = false, isReadRequest = false } = options ?? {};
  const panelSchema = getPanelSchema(embeddableSchemas);

  const effectivePinnedPanelsSchema =
    isDashboardAppRequest && isReadRequest
      ? (z
          .array(z.object({}).loose())
          .max(Number.MAX_SAFE_INTEGER) as unknown as typeof pinnedPanelsSchema)
      : pinnedPanelsSchema;

  return z
    .object({
      pinned_panels: z.array(
        isDashboardAppRequest // looser route validation for dashboard application requests
          ? (z.object({}).loose() as unknown as ReturnType<typeof effectivePinnedPanelsSchema>) // keeps derived types happy
          : effectivePinnedPanelsSchema
      ),
      description: z
        .string()
        .optional()
        .meta({ description: 'A short description of the dashboard.' }),
      filters: z
        .array(asCodeFilterSchema)
        .max(isDashboardAppRequest && isReadRequest ? Number.MAX_SAFE_INTEGER : 500)
        .optional()
        .meta({
          description: 'Filters applied across all panels, including pinned panels.',
        }),
      options: optionsSchema,
      panels: z
        .array(
          isDashboardAppRequest // looser route validation for dashboard application requests
            ? (z.object({}).loose() as unknown as ReturnType<typeof getPanelSchema>) // keeps derived types happy
            : z.union([panelSchema, getSectionSchema(panelSchema)])
        )
        .max(isDashboardAppRequest && isReadRequest ? Number.MAX_SAFE_INTEGER : MAX_PANELS)
        .default([])
        .meta({
          description:
            'Panels and sections in the dashboard. Each entry is either a panel (with a `type` and `config`) or a collapsible section (with a `title`, `collapsed` state, and nested `panels`).',
        }),
      project_routing: z.string().optional().meta({
        description:
          'Controls [cross-project search](https://www.elastic.co/docs/explore-analyze/cross-project-search/cross-project-search-project-routing) behavior for this dashboard (Serverless only). Set to `_alias:_origin` to scope data to the current project, or `_alias:*` to search across all projects. When omitted, the space default applies.',
      }),
      ...asCodeEsqlApproximationSchema.shape,
      query: asCodeQuerySchema.optional(),
      refresh_interval: refreshIntervalSchema.optional(),
      tags: getAsCodeTagsSchema(
        'Tag IDs to associate with this dashboard.',
        isDashboardAppRequest && isReadRequest ? Number.MAX_SAFE_INTEGER : undefined
      ).optional(),
      time_range: timeRangeSchema.optional(),
      title: z.string().min(1).meta({ description: 'A human-readable title for the dashboard.' }),
      access_control: accessControlSchema,
    })
    .strict()
    .superRefine((dashboardState, ctx) => {
      if (isDashboardAppRequest) return;
      const panelCount = countPanels(dashboardState.panels as unknown[]);
      const pinned = (dashboardState as { pinned_panels: unknown }).pinned_panels;
      const allPanelCount = panelCount + (Array.isArray(pinned) ? pinned.length : 0);
      if (allPanelCount > MAX_PANELS) {
        ctx.addIssue({
          code: 'custom',
          message: `Dashboard contains ${allPanelCount} panels, pinned panels, and sections, which exceeds the maximum of ${MAX_PANELS}.`,
        });
      }
    })
    .meta({
      id: isDashboardAppRequest ? 'kbn-dashboard-app-data' : 'kbn-dashboard-data',
    });
}

function isSection(item: unknown): item is { panels: unknown[] } {
  return (
    typeof item === 'object' &&
    item !== null &&
    'panels' in item &&
    Array.isArray((item as { panels: unknown }).panels)
  );
}

function countPanels(panels: unknown[]): number {
  let count = 0;
  for (const panel of panels) {
    if (isSection(panel)) {
      count++; // count the section itself as a panel
      count += countPanels(panel.panels);
    } else {
      count++;
    }
  }
  return count;
}
