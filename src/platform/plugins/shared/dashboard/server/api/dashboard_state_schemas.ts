/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { refreshIntervalSchema } from '@kbn/data-service-server';
import { asCodeFilterSchema } from '@kbn/as-code-filters-schema';
import { asCodeQuerySchema } from '@kbn/as-code-shared-schemas';
import { getControlsGroupSchema } from '@kbn/controls-schemas';
import { timeRangeSchema } from '@kbn/es-query-server';
import { embeddableService } from '../kibana_services';

import { DASHBOARD_GRID_COLUMN_COUNT } from '../../common/page_bundle_constants';
import {
  DEFAULT_PANEL_HEIGHT,
  DEFAULT_PANEL_WIDTH,
  DEFAULT_DASHBOARD_OPTIONS,
} from '../../common/constants';
import { isDashboardSection } from '../../common';
import type { DashboardPanel, DashboardSection } from './types';

const MAX_PANELS = 1000;

export const panelGridSchema = z
  .object({
    x: z.number().meta({ description: 'The x coordinate of the panel in grid units.' }),
    y: z.number().meta({ description: 'The y coordinate of the panel in grid units.' }),
    w: z.number().min(1).max(DASHBOARD_GRID_COLUMN_COUNT).default(DEFAULT_PANEL_WIDTH).meta({
      description:
        'The width of the panel in grid units. Minimum `1`, maximum `48`. Defaults to `24`.',
    }),
    h: z.number().min(1).default(DEFAULT_PANEL_HEIGHT).meta({
      description: 'The height of the panel in grid units. Minimum `1`. Defaults to `15`.',
    }),
  })
  .strict()
  .meta({
    id: 'kbn-dashboard-panel-grid',
    title: 'Panel grid',
    description: 'The position and size of the panel on the dashboard grid.',
  });

const basePanelSchema = z
  .object({
    id: z.string().optional().meta({ description: 'The unique ID of the panel.' }),
    type: z.string(),
    grid: panelGridSchema,
    // TODO: enforce Serializable type, see https://github.com/elastic/kibana/pull/269196
    config: z.object({}).loose() as z.ZodType<{}>,
  })
  .strict()
  .meta({
    id: 'kbn-dashboard-panel-type-unknown',
  });

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

const sectionGridSchema = z
  .object({
    y: z.number().meta({ description: 'The y coordinate of the section in grid units.' }),
  })
  .strict();

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

export const optionsSchema = z
  .object({
    auto_apply_filters: z.boolean().default(DEFAULT_DASHBOARD_OPTIONS.auto_apply_filters).meta({
      description:
        "When `true`, control filter changes are applied automatically. When `false`, control filter changes are applied manually through the dashboard's search update button. Defaults to `true`.",
    }),
    hide_panel_titles: z
      .boolean()
      .default(DEFAULT_DASHBOARD_OPTIONS.hide_panel_titles)
      .meta({ description: 'When `true`, panel titles are hidden. Defaults to `false`.' }),
    hide_panel_borders: z
      .boolean()
      .default(DEFAULT_DASHBOARD_OPTIONS.hide_panel_borders)
      .meta({ description: 'When `true`, panel borders are hidden. Defaults to `false`.' }),
    use_margins: z
      .boolean()
      .default(DEFAULT_DASHBOARD_OPTIONS.use_margins)
      .meta({ description: 'When `true`, panels are separated by a margin. Defaults to `true`.' }),
    sync_colors: z.boolean().default(DEFAULT_DASHBOARD_OPTIONS.sync_colors).meta({
      description:
        'When `true`, colors are synchronized across panels that share a data source. Defaults to `false`.',
    }),
    sync_tooltips: z.boolean().default(DEFAULT_DASHBOARD_OPTIONS.sync_tooltips).meta({
      description: 'When `true`, tooltips are synchronized across panels. Defaults to `false`.',
    }),
    sync_cursor: z.boolean().default(DEFAULT_DASHBOARD_OPTIONS.sync_cursor).meta({
      description:
        'When `true`, the cursor position is synchronized across panels. Defaults to `true`.',
    }),
  })
  .strict()
  .default(DEFAULT_DASHBOARD_OPTIONS)
  .meta({
    id: 'kbn-dashboard-options',
    title: 'Options',
    description: 'Display and behavior settings for the dashboard.',
  });

export const accessControlSchema = z
  .object({
    access_mode: z
      .union([z.literal('write_restricted'), z.literal('default')])
      .optional()
      .meta({
        description:
          'Controls edit access to the dashboard. Set to `write_restricted` to prevent edits by users without explicit write permission. Defaults to `default` (all viewers can edit).',
      }),
  })
  .strict()
  .optional()
  .meta({
    description: 'Access control settings for the dashboard.',
    id: 'kbn-dashboard-access-control',
    title: 'Access control',
  });

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
      query: asCodeQuerySchema.optional(),
      refresh_interval: refreshIntervalSchema.optional(),
      tags: z
        .array(z.string())
        .max(100)
        .optional()
        .meta({ description: 'Tag IDs to associate with this dashboard.' }),
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
