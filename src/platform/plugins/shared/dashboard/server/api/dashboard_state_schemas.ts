/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ObjectType } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { refreshIntervalSchema } from '@kbn/data-service-server';
/**
 * Currently, controls are the only pinnable panels. However, if we intend to make this extendable, we should instead
 * get the pinned panel schema from a pinned panel registry **independent** from controls
 */
import { controlsGroupSchema as pinnedPanelsSchema } from '@kbn/controls-schemas';
import { storedFilterSchema, querySchema, timeRangeSchema } from '@kbn/es-query-server';
import { embeddableService } from '../kibana_services';
import { DASHBOARD_GRID_COLUMN_COUNT } from '../../common/page_bundle_constants';
import {
  DEFAULT_PANEL_HEIGHT,
  DEFAULT_PANEL_WIDTH,
  DEFAULT_DASHBOARD_OPTIONS,
} from '../../common/constants';

export const allowUnmappedKeysSchema = schema.boolean({
  defaultValue: false,
  meta: {
    deprecated: true,
    description:
      'When enabled, dashboard REST endpoints support unmapped keys. Unmapped key schemas can be changed or removed without notice and are not supported.',
  },
});

export const panelGridSchema = schema.object({
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
});

export function getPanelSchema() {
  return schema.object({
    config: schema.oneOf([
      ...((embeddableService ? embeddableService.getEmbeddableSchemas() : []) as [ObjectType<{}>]),
      schema.object(
        {},
        {
          unknowns: 'allow',
        }
      ),
    ]) as ObjectType<{}>,
    type: schema.string({ meta: { description: 'The embeddable type' } }),
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
    version: schema.maybe(
      schema.string({
        meta: {
          description:
            "The version was used to store Kibana version information from versions 7.3.0 -> 8.11.0. As of version 8.11.0, the versioning information is now per-embeddable-type and is stored on the embeddable's input. (config in this type).",
          deprecated: true,
        },
      })
    ),
  });
}

const sectionGridSchema = schema.object({
  y: schema.number({ meta: { description: 'The y coordinate of the section in grid units' } }),
});

export function getSectionSchema() {
  return schema.object({
    title: schema.string({
      meta: { description: 'The title of the section.' },
    }),
    collapsed: schema.maybe(
      schema.boolean({
        meta: { description: 'The collapsed state of the section.' },
        defaultValue: false,
      })
    ),
    grid: sectionGridSchema,
    panels: schema.arrayOf(getPanelSchema(), {
      meta: { description: 'The panels that belong to the section.' },
      defaultValue: [],
    }),
    uid: schema.maybe(
      schema.string({
        meta: { description: 'The unique ID of the section.' },
      })
    ),
  });
}

export const optionsSchema = schema.object({
  auto_apply_filters: schema.maybe(
    schema.boolean({
      defaultValue: DEFAULT_DASHBOARD_OPTIONS.auto_apply_filters,
      meta: { description: 'Auto apply control filters.' },
    })
  ),
  hide_panel_titles: schema.maybe(
    schema.boolean({
      defaultValue: DEFAULT_DASHBOARD_OPTIONS.hide_panel_titles,
      meta: { description: 'Hide the panel titles in the dashboard.' },
    })
  ),
  use_margins: schema.maybe(
    schema.boolean({
      defaultValue: DEFAULT_DASHBOARD_OPTIONS.use_margins,
      meta: { description: 'Show margins between panels in the dashboard layout.' },
    })
  ),
  sync_colors: schema.maybe(
    schema.boolean({
      defaultValue: DEFAULT_DASHBOARD_OPTIONS.sync_colors,
      meta: { description: 'Synchronize colors between related panels in the dashboard.' },
    })
  ),
  sync_tooltips: schema.maybe(
    schema.boolean({
      defaultValue: DEFAULT_DASHBOARD_OPTIONS.sync_tooltips,
      meta: { description: 'Synchronize tooltips between related panels in the dashboard.' },
    })
  ),
  sync_cursor: schema.maybe(
    schema.boolean({
      defaultValue: DEFAULT_DASHBOARD_OPTIONS.sync_cursor,
      meta: {
        description: 'Synchronize cursor position between related panels in the dashboard.',
      },
    })
  ),
});

export const accessControlSchema = schema.maybe(
  schema.object({
    owner: schema.maybe(schema.string()),
    access_mode: schema.maybe(
      schema.oneOf([schema.literal('write_restricted'), schema.literal('default')])
    ),
  })
);

export function getDashboardStateSchema() {
  return schema.object({
    pinned_panels: schema.maybe(pinnedPanelsSchema),
    description: schema.maybe(schema.string({ meta: { description: 'A short description.' } })),
    filters: schema.maybe(schema.arrayOf(storedFilterSchema)),
    options: schema.maybe(optionsSchema),
    panels: schema.maybe(
      schema.arrayOf(schema.oneOf([getPanelSchema(), getSectionSchema()]), {
        defaultValue: [],
      })
    ),
    project_routing: schema.maybe(schema.string()),
    query: schema.maybe(querySchema),
    refresh_interval: schema.maybe(refreshIntervalSchema),
    tags: schema.maybe(
      schema.arrayOf(
        schema.string({ meta: { description: 'An array of tags ids applied to this dashboard' } })
      )
    ),
    time_range: schema.maybe(timeRangeSchema),
    title: schema.string({ meta: { description: 'A human-readable title for the dashboard' } }),
    access_control: accessControlSchema,
  });
}
