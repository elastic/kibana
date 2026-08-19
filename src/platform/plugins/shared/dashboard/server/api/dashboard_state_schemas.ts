/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { asCodeFilterSchema } from '@kbn/as-code-filters-schema';
import {
  asCodeEsqlApproximationSchema,
  asCodeQuerySchema,
  getAsCodeTagsSchema,
} from '@kbn/as-code-shared-schemas';
import {
  panelGridSchema,
  optionsSchema,
  accessControlSchema,
  sectionGridSchema,
  basePanelSchema,
  MAX_PANELS,
} from '@kbn/as-code-dashboard-schema';
import { getControlsGroupSchema } from '@kbn/controls-schemas';
import { refreshIntervalSchema } from '@kbn/data-service-server';
import { timeRangeSchema } from '@kbn/es-query-server';
import { embeddableService } from '../kibana_services';

import { isDashboardSection } from '../../common';
import type { DashboardPanel, DashboardSection } from './types';

export { panelGridSchema, optionsSchema, accessControlSchema, sectionGridSchema };

export function getPanelSchema() {
  const embeddableSchemas = embeddableService ? embeddableService.getAllEmbeddableSchemas() : {};

  const panelSchemas = Object.entries(embeddableSchemas)
    // sort to ensure consistent order in OAS documenation
    .sort(([aType, { title: aTitle }], [bType, { title: bTitle }]) => aTitle.localeCompare(bTitle))
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

export function getSectionSchema<T extends ReturnType<typeof getPanelSchema>>(panelSchema: T) {
  return z
    .object({
      title: z.string().meta({ description: 'The title of the section.' }),
      collapsed: z.boolean().default(false).meta({
        description:
          'When `true`, the section is collapsed and its panels are not rendered until expanded. Useful for improving initial load time on large dashboards. Defaults to `false`.',
      }),
      grid: sectionGridSchema,
      panels: z
        .array(panelSchema)
        .max(MAX_PANELS)
        .default([])
        .meta({ description: 'The panels that belong to the section.' }),
      id: z.string().optional().meta({ description: 'The unique ID of the section.' }),
    })
    .strict()
    .meta({
      description: 'A collapsible group of panels.',
      id: 'kbn-dashboard-section',
      title: 'Section',
    });
}

export function getPinnedPanelsSchema(
  isDashboardAppRequest: boolean = false,
  isReadRequest: boolean = false
) {
  return isDashboardAppRequest && isReadRequest // looser route validation for dashboard application read requests
    ? (z.array(z.object({}).loose()).max(Number.MAX_SAFE_INTEGER) as unknown as ReturnType<
        typeof getControlsGroupSchema
      >) // keeps derived types happy
    : getControlsGroupSchema();
}

export function getDashboardStateSchema(
  isDashboardAppRequest: boolean,
  isReadRequest: boolean = false
) {
  const panelSchema = getPanelSchema(); // call once to avoid duplicate schemas
  return z
    .object({
      pinned_panels: getPinnedPanelsSchema(isDashboardAppRequest, isReadRequest),
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
      const panelCount = countPanels(dashboardState.panels);
      const allPanelCount = panelCount + (dashboardState.pinned_panels?.length ?? 0);
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

function countPanels(panels: Array<DashboardPanel | DashboardSection>): number {
  let count = 0;
  for (const panel of panels) {
    if (isDashboardSection(panel)) {
      count++; // count the section itself as a panel
      count += countPanels(panel.panels);
    } else {
      count++;
    }
  }
  return count;
}
