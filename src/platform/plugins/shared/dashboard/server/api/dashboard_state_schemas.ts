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
import { controlsGroupSchema } from '@kbn/controls-schemas';
import { referenceSchema } from '@kbn/content-management-utils';
import { storedFilterSchema, querySchema, timeRangeSchema } from '@kbn/es-query-server';
import { embeddableService } from '../kibana_services';
import { DASHBOARD_GRID_COLUMN_COUNT } from '../../common/page_bundle_constants';
import {
  DEFAULT_PANEL_HEIGHT,
  DEFAULT_PANEL_WIDTH,
  DEFAULT_DASHBOARD_OPTIONS,
} from '../../common/constants';

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
  hidePanelTitles: schema.maybe(
    schema.boolean({
      defaultValue: DEFAULT_DASHBOARD_OPTIONS.hidePanelTitles,
      meta: { description: 'Hide the panel titles in the dashboard.' },
    })
  ),
  useMargins: schema.maybe(
    schema.boolean({
      defaultValue: DEFAULT_DASHBOARD_OPTIONS.useMargins,
      meta: { description: 'Show margins between panels in the dashboard layout.' },
    })
  ),
  syncColors: schema.maybe(
    schema.boolean({
      defaultValue: DEFAULT_DASHBOARD_OPTIONS.syncColors,
      meta: { description: 'Synchronize colors between related panels in the dashboard.' },
    })
  ),
  syncTooltips: schema.maybe(
    schema.boolean({
      defaultValue: DEFAULT_DASHBOARD_OPTIONS.syncTooltips,
      meta: { description: 'Synchronize tooltips between related panels in the dashboard.' },
    })
  ),
  syncCursor: schema.maybe(
    schema.boolean({
      defaultValue: DEFAULT_DASHBOARD_OPTIONS.syncCursor,
      meta: {
        description: 'Synchronize cursor position between related panels in the dashboard.',
      },
    })
  ),
});

export function getDashboardStateSchema() {
  return schema.object({
    controlGroupInput: schema.maybe(controlsGroupSchema),
    description: schema.maybe(schema.string({ meta: { description: 'A short description.' } })),
    filters: schema.maybe(schema.arrayOf(storedFilterSchema)),
    options: schema.maybe(optionsSchema),
    panels: schema.arrayOf(schema.oneOf([getPanelSchema(), getSectionSchema()]), {
      defaultValue: [],
    }),
    query: schema.maybe(querySchema),
    references: schema.maybe(schema.arrayOf(referenceSchema)),
    refreshInterval: schema.maybe(refreshIntervalSchema),
    tags: schema.maybe(
      schema.arrayOf(
        schema.string({ meta: { description: 'An array of tags ids applied to this dashboard' } })
      )
    ),
    timeRange: schema.maybe(timeRangeSchema),
    title: schema.string({ meta: { description: 'A human-readable title for the dashboard' } }),
    version: schema.maybe(schema.number({ meta: { deprecated: true } })),
  });
}
