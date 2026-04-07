/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ObjectType, Type } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { refreshIntervalSchema } from '@kbn/data-service-server';
import { asCodeFilterSchema } from '@kbn/as-code-filters-schema';
import { asCodeQuerySchema } from '@kbn/as-code-shared-schemas';
/**
 * Currently, controls are the only pinnable panels. However, if we intend to make this extendable, we should instead
 * get the pinned panel schema from a pinned panel registry **independent** from controls
 */
import { getControlsGroupSchema as getPinnedPanelsSchema } from '@kbn/controls-schemas';
import { timeRangeSchema } from '@kbn/es-query-server';
import { embeddableService } from '../kibana_services';
import { DASHBOARD_GRID_COLUMN_COUNT } from '../../common/page_bundle_constants';
import {
  DEFAULT_PANEL_HEIGHT,
  DEFAULT_PANEL_WIDTH,
  DEFAULT_DASHBOARD_OPTIONS,
} from '../../common/constants';

const MAX_PANELS = 100;

export const panelGridSchema = schema.object(
  {
    x: schema.number({ meta: { description: 'The x coordinate of the panel in grid units' } }),
    y: schema.number({ meta: { description: 'The y coordinate of the panel in grid units' } }),
    w: schema.number({
      defaultValue: DEFAULT_PANEL_WIDTH,
      min: 1,
      max: DASHBOARD_GRID_COLUMN_COUNT,
      meta: { description: 'The width of the panel in grid units' },
    }),
    h: schema.number({
      defaultValue: DEFAULT_PANEL_HEIGHT,
      min: 1,
      meta: { description: 'The height of the panel in grid units' },
    }),
  },
  {
    meta: {
      id: 'kbn-dashboard-panel-grid',
    },
  }
);

export function getPanelSchema(isDashboardAppRequest: boolean) {
  const basePanelProps = {
    grid: panelGridSchema,
    /**
     * `uid` was chosen as a name instead of `id` to avoid bwc issues with legacy dashboard URL state that used `id` to
     * represent ids of library items in by-reference panels. This was previously called `panelIndex` in DashboardPanelState.
     * In the stored object, `uid` continues to map to `panelIndex`.
     */
    uid: schema.maybe(
      schema.string({
        meta: { description: 'The unique ID of the panel.' },
      })
    ),
  };

  // looser route validation for dashboard application requests
  // TODO remove when all embeddables register schemas
  if (isDashboardAppRequest) {
    return schema.object({
      ...basePanelProps,
      type: schema.string(),
      config: schema.object(
        {},
        {
          unknowns: 'allow',
        }
      ),
    });
  }

  const embeddableSchemas = embeddableService ? embeddableService.getAllEmbeddableSchemas() : {};
  const panelSchemas = Object.entries(embeddableSchemas)
    // sort to ensure consistent order in OAS documenation
    .sort(([aType], [bType]) => aType.localeCompare(bType))
    .map(([type, configSchema]) =>
      schema.object(
        {
          ...basePanelProps,
          type: schema.literal(type),
          config: configSchema,
        },
        {
          meta: {
            id: `kbn-dashboard-panel-type-${type}`,
            title: type,
          },
        }
      )
    );

  return schema.discriminatedUnion(
    'type',
    panelSchemas as [
      ObjectType<{
        grid: ObjectType<{ x: Type<number>; y: Type<number>; w: Type<number>; h: Type<number> }>;
        uid: Type<string | undefined>;
        version: Type<string | undefined>;
        type: Type<string>;
        config: ObjectType<{}>;
      }>
    ]
  );
}

const sectionGridSchema = schema.object({
  y: schema.number({ meta: { description: 'The y coordinate of the section in grid units' } }),
});

export function getSectionSchema(isDashboardAppRequest: boolean) {
  return schema.object(
    {
      title: schema.string({
        meta: { description: 'The title of the section.' },
      }),
      collapsed: schema.boolean({
        meta: { description: 'The collapsed state of the section.' },
        defaultValue: false,
      }),
      grid: sectionGridSchema,
      panels: schema.arrayOf(getPanelSchema(isDashboardAppRequest), {
        meta: { description: 'The panels that belong to the section.' },
        defaultValue: [],
        maxSize: MAX_PANELS,
      }),
      uid: schema.maybe(
        schema.string({
          meta: { description: 'The unique ID of the section.' },
        })
      ),
    },
    {
      meta: {
        description: 'Collapsable section',
        id: 'kbn-dashboard-section',
        title: 'section',
      },
    }
  );
}

export const optionsSchema = schema.object(
  {
    auto_apply_filters: schema.boolean({
      defaultValue: DEFAULT_DASHBOARD_OPTIONS.auto_apply_filters,
      meta: { description: 'Auto apply control filters.' },
    }),
    hide_panel_titles: schema.boolean({
      defaultValue: DEFAULT_DASHBOARD_OPTIONS.hide_panel_titles,
      meta: { description: 'Hide the panel titles in the dashboard.' },
    }),
    hide_panel_borders: schema.boolean({
      defaultValue: DEFAULT_DASHBOARD_OPTIONS.hide_panel_borders,
      meta: { description: 'Hide the panel borders in the dashboard.' },
    }),
    use_margins: schema.boolean({
      defaultValue: DEFAULT_DASHBOARD_OPTIONS.use_margins,
      meta: { description: 'Show margins between panels in the dashboard layout.' },
    }),
    sync_colors: schema.boolean({
      defaultValue: DEFAULT_DASHBOARD_OPTIONS.sync_colors,
      meta: { description: 'Synchronize colors between related panels in the dashboard.' },
    }),
    sync_tooltips: schema.boolean({
      defaultValue: DEFAULT_DASHBOARD_OPTIONS.sync_tooltips,
      meta: { description: 'Synchronize tooltips between related panels in the dashboard.' },
    }),
    sync_cursor: schema.boolean({
      defaultValue: DEFAULT_DASHBOARD_OPTIONS.sync_cursor,
      meta: {
        description: 'Synchronize cursor position between related panels in the dashboard.',
      },
    }),
  },
  {
    defaultValue: DEFAULT_DASHBOARD_OPTIONS,
    meta: {
      id: 'kbn-dashboard-options',
    },
  }
);

export const accessControlSchema = schema.maybe(
  schema.object({
    access_mode: schema.maybe(
      schema.oneOf([schema.literal('write_restricted'), schema.literal('default')])
    ),
  })
);

export function getDashboardStateSchema(isDashboardAppRequest: boolean) {
  return schema.object(
    {
      pinned_panels: getPinnedPanelsSchema(),
      description: schema.maybe(schema.string({ meta: { description: 'A short description.' } })),
      filters: schema.maybe(schema.arrayOf(asCodeFilterSchema, { maxSize: 500 })),
      options: optionsSchema,
      panels: schema.arrayOf(
        schema.oneOf([
          getPanelSchema(isDashboardAppRequest),
          getSectionSchema(isDashboardAppRequest),
        ]),
        {
          defaultValue: [],
          maxSize: MAX_PANELS,
        }
      ),
      project_routing: schema.maybe(schema.string()),
      query: schema.maybe(asCodeQuerySchema),
      refresh_interval: schema.maybe(refreshIntervalSchema),
      tags: schema.maybe(
        schema.arrayOf(
          schema.string({
            meta: { description: 'An array of tags ids applied to this dashboard' },
          }),
          {
            maxSize: 100,
          }
        )
      ),
      time_range: schema.maybe(timeRangeSchema),
      title: schema.string({ meta: { description: 'A human-readable title for the dashboard' } }),
      access_control: accessControlSchema,
    },
    {
      meta: {
        id: isDashboardAppRequest ? 'kbn-dashboard-app-data' : 'kbn-dashboard-data',
      },
    }
  );
}
