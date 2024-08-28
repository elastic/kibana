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
    panelsJSON: schema.maybe(
      schema.string({
        meta: {
          description:
            'Stringified JSON representing the state of the controls panels in the dashboard.',
        },
      })
    ),
    controlStyle: schema.maybe(
      schema.string({
        meta: { description: 'Style of the controls. For example, "oneLine", "twoLine".' },
      })
    ),
    chainingSystem: schema.maybe(
      schema.string({
        meta: {
          description:
            'The chaining strategy for multiple controls. For example, "HIERARCHICAL" or "NONE".',
        },
      })
    ),
    ignoreParentSettingsJSON: schema.maybe(
      schema.string({
        meta: {
          description:
            'Stringified JSON representing options for ignoring certain parent settings.',
        },
      })
    ),
  })
  .extends({}, { unknowns: 'ignore' });

const searchSourceSchema = schema
  .object({
    query: schema.maybe(
      schema.oneOf([
        schema.object({
          query: schema.oneOf([
            schema.string({
              meta: {
                description:
                  'A text-based query such as Kibana Query Language (KQL) or Lucene query language.',
              },
            }),
            schema.recordOf(schema.string(), schema.any()),
          ]),
          language: schema.string({
            meta: { description: 'The query language such as KQL or Lucene.' },
          }),
        }),
        schema.object({
          esql: schema.string({
            meta: { description: 'An Elasticsearch Query Language (ESQL) expression.' },
          }),
        }),
      ])
    ),
    filter: schema.maybe(
      schema.arrayOf(
        schema.object({
          meta: schema.object({}, { unknowns: 'allow' }),
          query: schema.maybe(schema.recordOf(schema.string(), schema.any())),
          $state: schema.maybe(
            schema.object({
              store: schema.string({
                meta: {
                  description:
                    "Denote whether a filter is specific to an application's context (e.g. 'appState') or whether it should be applied globally (e.g. 'globalState').",
                },
              }),
            })
          ),
        })
      )
    ),
  })
  .extends({}, { unknowns: 'allow' });

const panelsSchema = schema.arrayOf(
  schema.object({
    embeddableConfig: schema.recordOf(
      schema.string(),
      schema.any({ meta: { description: "Parsed into the panel's explicitInput" } })
    ),
    id: schema.maybe(
      schema.string({ meta: { description: 'The saved object id for by reference panels' } })
    ),
    type: schema.string({ meta: { description: 'The embeddable type' } }),
    panelRefName: schema.maybe(schema.string()),
    gridData: schema.object({
      x: schema.number({ meta: { description: 'The x coordinate of the panel in grid units' } }),
      y: schema.number({ meta: { description: 'The y coordinate of the panel in grid units' } }),
      w: schema.number({ meta: { description: 'The width of the panel in grid units' } }),
      h: schema.number({ meta: { description: 'The height of the panel in grid units' } }),
      i: schema.string({ meta: { description: 'The unique identifier of the panel' } }),
    }),
    panelIndex: schema.string({ meta: { description: 'The unique identifier of the panel' } }),
    title: schema.maybe(schema.string({ meta: { description: 'The title of the panel' } })),
    version: schema.maybe(
      schema.string({
        meta: {
          description:
            "The version was used to store Kibana version information from versions 7.3.0 -> 8.11.0. As of version 8.11.0, the versioning information is now per-embeddable-type and is stored on the embeddable's input. (embeddableConfig in this type).",
          deprecated: true,
        },
      })
    ),
  })
);

const optionsSchema = schema.object({
  hidePanelTitles: schema.boolean({
    defaultValue: false,
    meta: { description: 'Hide the panel titles in the dashboard.' },
  }),
  useMargins: schema.boolean({
    defaultValue: true,
    meta: { description: 'Show margins between panels in the dashboard layout.' },
  }),
  syncColors: schema.boolean({
    defaultValue: true,
    meta: { description: 'Synchronize colors between related panels in the dashboard.' },
  }),
  syncTooltips: schema.boolean({
    defaultValue: true,
    meta: { description: 'Synchronize tooltips between related panels in the dashboard.' },
  }),
  syncCursor: schema.boolean({
    defaultValue: true,
    meta: { description: 'Synchronize cursor position between related panels in the dashboard.' },
  }),
});

export const baseDashboard = schema.object({
  // General
  title: schema.maybe(
    schema.string({ meta: { description: 'A human-readable title for the dashboard' } })
  ),
  description: schema.maybe(schema.string({ meta: { description: 'A short description.' } })),

  // Search
  kibanaSavedObjectMeta: schema.object(
    {
      searchSource: searchSourceSchema,
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
            description: 'A numeric value indicating refresh frequency in milliseconds.',
          },
        }),
        display: schema.maybe(
          schema.string({
            meta: {
              description:
                'A human-readable string indicating the refresh frequency. No longer used.',
              deprecated: true,
            },
          })
        ),
        section: schema.maybe(
          schema.number({
            meta: {
              description: 'No longer used.', // TODO what is this legacy property?
              deprecated: true,
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
  panels: panelsSchema,
  options: optionsSchema,

  // Legacy
  // hits: schema.maybe(schema.number()),
  version: schema.maybe(schema.number()),
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
