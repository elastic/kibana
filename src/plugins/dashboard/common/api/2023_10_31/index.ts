/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

const controlGroupInputSchema = schema
  .object({
    panelsJSON: schema.maybe(schema.string({ meta: { description: 'Lorem ipsum' } })),
    controlStyle: schema.maybe(schema.string({ meta: { description: 'Lorem ipsum' } })),
    chainingSystem: schema.maybe(schema.string({ meta: { description: 'Lorem ipsum' } })),
    ignoreParentSettingsJSON: schema.maybe(schema.string({ meta: { description: 'Lorem ipsum' } })),
  })
  .extends({}, { unknowns: 'ignore' });

const baseDashboard = schema.object({
  // General
  title: schema.string({ meta: { description: 'A human-readable title for the dashboard' } }),
  description: schema.string({ defaultValue: '', meta: { description: 'A short description.' } }),

  // Search
  kibanaSavedObjectMeta: schema.object(
    {
      searchSourceJSON: schema.maybe(
        schema.string({
          meta: {
            description: 'A string containing search source',
          },
        })
      ),
    },
    {
      meta: {
        description: 'A container for various metadata',
      },
    }
  ),

  // Time
  timeRestore: schema.maybe(
    schema.boolean({ meta: { description: 'Whether to restore time upon viewing this dashboard' } })
  ),
  timeFrom: schema.maybe(
    schema.string({ meta: { description: 'An ISO string indicating when to restore time from' } })
  ),
  timeTo: schema.maybe(
    schema.string({ meta: { description: 'An ISO string indicating when to restore time from' } })
  ),
  refreshInterval: schema.maybe(
    schema.object(
      {
        pause: schema.boolean({
          meta: {
            description:
              'Whether the refresh interval is set to be paused while viewing the dashboard.',
          },
        }),
        value: schema.number({
          meta: {
            description:
              'A numeric value indicating refresh frequency expressed as, for example, 30s.',
          },
        }),
        display: schema.maybe(
          schema.string({
            meta: {
              description: 'Lorem ipsum',
            },
          })
        ),
        section: schema.maybe(
          schema.number({
            meta: {
              description: 'Lorem ipsum',
            },
          })
        ),
      },
      {
        meta: {
          description: 'A container for various refresh interval settings',
        },
      }
    )
  ),

  // Dashboard Content
  controlGroupInput: schema.maybe(controlGroupInputSchema),
  panelsJSON: schema.string({ defaultValue: '[]', meta: { description: 'Lorem ipsum' } }),
  optionsJSON: schema.string({ defaultValue: '{}', meta: { description: 'Lorem ipsum' } }),

  // Legacy
  // hits: schema.maybe(schema.number()),
  // version: schema.maybe(schema.number()),
});

export const dashboardCreate = baseDashboard.extends(
  {
    id: schema.maybe(schema.string({ meta: { description: 'The ID of the dashboard' } })),
  },
  {
    meta: { id: 'dashboard_create' },
  }
);

export const dashboard = () =>
  baseDashboard.extends(
    {
      id: schema.string({ meta: { description: 'The ID of the dashboard' } }),
    },
    {
      meta: { id: 'dashboard' },
    }
  );

export type Dashboard = TypeOf<typeof dashboard>;
