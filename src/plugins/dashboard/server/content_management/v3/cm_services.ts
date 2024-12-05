/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, Type } from '@kbn/config-schema';
import { createOptionsSchemas, updateOptionsSchema } from '@kbn/content-management-utils';
import type { ContentManagementServicesDefinition as ServicesDefinition } from '@kbn/object-versioning';
import {
  type ControlGroupChainingSystem,
  type ControlLabelPosition,
  type ControlWidth,
  CONTROL_CHAINING_OPTIONS,
  CONTROL_LABEL_POSITION_OPTIONS,
  CONTROL_WIDTH_OPTIONS,
  DEFAULT_CONTROL_CHAINING,
  DEFAULT_CONTROL_GROW,
  DEFAULT_CONTROL_LABEL_POSITION,
  DEFAULT_CONTROL_WIDTH,
  DEFAULT_IGNORE_PARENT_SETTINGS,
  DEFAULT_AUTO_APPLY_SELECTIONS,
} from '@kbn/controls-plugin/common';
import { FilterStateStore } from '@kbn/es-query';
import { SortDirection } from '@kbn/data-plugin/common/search';
import {
  DASHBOARD_GRID_COLUMN_COUNT,
  DEFAULT_PANEL_HEIGHT,
  DEFAULT_PANEL_WIDTH,
  DEFAULT_DASHBOARD_OPTIONS,
} from '../../../common/content_management';
import { getResultV3ToV2 } from './transform_utils';

const apiError = schema.object({
  error: schema.string(),
  message: schema.string(),
  statusCode: schema.number(),
  metadata: schema.maybe(schema.object({}, { unknowns: 'allow' })),
});

// This schema should be provided by the controls plugin. Perhaps we can resolve this with the embeddable registry.
// See https://github.com/elastic/kibana/issues/192622
export const controlGroupInputSchema = schema.object({
  controls: schema.arrayOf(
    schema.object(
      {
        type: schema.string({ meta: { description: 'The type of the control panel.' } }),
        controlConfig: schema.maybe(schema.recordOf(schema.string(), schema.any())),
        id: schema.maybe(
          schema.string({
            meta: { description: 'The unique ID of the control.' },
          })
        ),
        order: schema.number({
          meta: {
            description: 'The order of the control panel in the control group.',
          },
        }),
        width: schema.oneOf(
          Object.values(CONTROL_WIDTH_OPTIONS).map((value) => schema.literal(value)) as [
            Type<ControlWidth>
          ],
          {
            defaultValue: DEFAULT_CONTROL_WIDTH,
            meta: { description: 'Minimum width of the control panel in the control group.' },
          }
        ),
        grow: schema.boolean({
          defaultValue: DEFAULT_CONTROL_GROW,
          meta: { description: 'Expand width of the control panel to fit available space.' },
        }),
      },
      { unknowns: 'allow' }
    ),
    {
      defaultValue: [],
      meta: { description: 'An array of control panels and their state in the control group.' },
    }
  ),
  labelPosition: schema.oneOf(
    Object.values(CONTROL_LABEL_POSITION_OPTIONS).map((value) => schema.literal(value)) as [
      Type<ControlLabelPosition>
    ],
    {
      defaultValue: DEFAULT_CONTROL_LABEL_POSITION,
      meta: {
        description: 'Position of the labels for controls. For example, "oneLine", "twoLine".',
      },
    }
  ),
  chainingSystem: schema.oneOf(
    Object.values(CONTROL_CHAINING_OPTIONS).map((value) => schema.literal(value)) as [
      Type<ControlGroupChainingSystem>
    ],
    {
      defaultValue: DEFAULT_CONTROL_CHAINING,
      meta: {
        description:
          'The chaining strategy for multiple controls. For example, "HIERARCHICAL" or "NONE".',
      },
    }
  ),
  enhancements: schema.maybe(schema.recordOf(schema.string(), schema.any())),
  ignoreParentSettings: schema.object({
    ignoreFilters: schema.boolean({
      meta: { description: 'Ignore global filters in controls.' },
      defaultValue: DEFAULT_IGNORE_PARENT_SETTINGS.ignoreFilters,
    }),
    ignoreQuery: schema.boolean({
      meta: { description: 'Ignore the global query bar in controls.' },
      defaultValue: DEFAULT_IGNORE_PARENT_SETTINGS.ignoreQuery,
    }),
    ignoreTimerange: schema.boolean({
      meta: { description: 'Ignore the global time range in controls.' },
      defaultValue: DEFAULT_IGNORE_PARENT_SETTINGS.ignoreTimerange,
    }),
    ignoreValidations: schema.boolean({
      meta: { description: 'Ignore validations in controls.' },
      defaultValue: DEFAULT_IGNORE_PARENT_SETTINGS.ignoreValidations,
    }),
  }),
  autoApplySelections: schema.boolean({
    meta: { description: 'Show apply selections button in controls.' },
    defaultValue: DEFAULT_AUTO_APPLY_SELECTIONS,
  }),
});

const searchSourceSchema = schema.object(
  {
    type: schema.maybe(schema.string()),
    query: schema.maybe(
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
      })
    ),
    filter: schema.maybe(
      schema.arrayOf(
        schema.object(
          {
            meta: schema.object(
              {
                alias: schema.maybe(schema.nullable(schema.string())),
                disabled: schema.maybe(schema.boolean()),
                negate: schema.maybe(schema.boolean()),
                controlledBy: schema.maybe(schema.string()),
                group: schema.maybe(schema.string()),
                index: schema.maybe(schema.string()),
                isMultiIndex: schema.maybe(schema.boolean()),
                type: schema.maybe(schema.string()),
                key: schema.maybe(schema.string()),
                params: schema.maybe(schema.any()),
                value: schema.maybe(schema.string()),
                field: schema.maybe(schema.string()),
              },
              { unknowns: 'allow' }
            ),
            query: schema.maybe(schema.recordOf(schema.string(), schema.any())),
            $state: schema.maybe(
              schema.object({
                store: schema.oneOf(
                  [
                    schema.literal(FilterStateStore.APP_STATE),
                    schema.literal(FilterStateStore.GLOBAL_STATE),
                  ],
                  {
                    meta: {
                      description:
                        "Denote whether a filter is specific to an application's context (e.g. 'appState') or whether it should be applied globally (e.g. 'globalState').",
                    },
                  }
                ),
              })
            ),
          },
          { meta: { description: 'A filter for the search source.' } }
        )
      )
    ),
    sort: schema.maybe(
      schema.arrayOf(
        schema.recordOf(
          schema.string(),
          schema.oneOf([
            schema.oneOf([schema.literal(SortDirection.asc), schema.literal(SortDirection.desc)]),
            schema.object({
              order: schema.oneOf([
                schema.literal(SortDirection.asc),
                schema.literal(SortDirection.desc),
              ]),
              format: schema.maybe(schema.string()),
            }),
            schema.object({
              order: schema.oneOf([
                schema.literal(SortDirection.asc),
                schema.literal(SortDirection.desc),
              ]),
              numeric_type: schema.maybe(
                schema.oneOf([
                  schema.literal('double'),
                  schema.literal('long'),
                  schema.literal('date'),
                  schema.literal('date_nanos'),
                ])
              ),
            }),
          ])
        )
      )
    ),
  },
  /**
   The Dashboard _should_ only ever uses the query and filters fields on the search
   source. But we should be liberal in what we accept, so we allow unknowns.
   */
  { defaultValue: {}, unknowns: 'allow' }
);

export const gridDataSchema = schema.object({
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
  i: schema.maybe(
    schema.string({
      meta: { description: 'The unique identifier of the panel' },
    })
  ),
});

export const panelSchema = schema.object({
  panelConfig: schema.object(
    {
      version: schema.maybe(
        schema.string({
          meta: { description: 'The version of the embeddable in the panel.' },
        })
      ),
      title: schema.maybe(schema.string({ meta: { description: 'The title of the panel' } })),
      description: schema.maybe(
        schema.string({ meta: { description: 'The description of the panel' } })
      ),
      savedObjectId: schema.maybe(
        schema.string({
          meta: { description: 'The unique id of the library item to construct the embeddable.' },
        })
      ),
      hidePanelTitles: schema.maybe(
        schema.boolean({
          defaultValue: false,
          meta: { description: 'Set to true to hide the panel title in its container.' },
        })
      ),
      enhancements: schema.maybe(schema.recordOf(schema.string(), schema.any())),
    },
    {
      unknowns: 'allow',
    }
  ),
  id: schema.maybe(
    schema.string({ meta: { description: 'The saved object id for by reference panels' } })
  ),
  type: schema.string({ meta: { description: 'The embeddable type' } }),
  panelRefName: schema.maybe(schema.string()),
  gridData: gridDataSchema,
  panelIndex: schema.maybe(
    schema.string({
      meta: { description: 'The unique ID of the panel.' },
    })
  ),
  title: schema.maybe(schema.string({ meta: { description: 'The title of the panel' } })),
  version: schema.maybe(
    schema.string({
      meta: {
        description:
          "The version was used to store Kibana version information from versions 7.3.0 -> 8.11.0. As of version 8.11.0, the versioning information is now per-embeddable-type and is stored on the embeddable's input. (panelConfig in this type).",
        deprecated: true,
      },
    })
  ),
});

export const optionsSchema = schema.object({
  hidePanelTitles: schema.boolean({
    defaultValue: DEFAULT_DASHBOARD_OPTIONS.hidePanelTitles,
    meta: { description: 'Hide the panel titles in the dashboard.' },
  }),
  useMargins: schema.boolean({
    defaultValue: DEFAULT_DASHBOARD_OPTIONS.useMargins,
    meta: { description: 'Show margins between panels in the dashboard layout.' },
  }),
  syncColors: schema.boolean({
    defaultValue: DEFAULT_DASHBOARD_OPTIONS.syncColors,
    meta: { description: 'Synchronize colors between related panels in the dashboard.' },
  }),
  syncTooltips: schema.boolean({
    defaultValue: DEFAULT_DASHBOARD_OPTIONS.syncTooltips,
    meta: { description: 'Synchronize tooltips between related panels in the dashboard.' },
  }),
  syncCursor: schema.boolean({
    defaultValue: DEFAULT_DASHBOARD_OPTIONS.syncCursor,
    meta: { description: 'Synchronize cursor position between related panels in the dashboard.' },
  }),
});

// These are the attributes that are returned in search results
export const searchResultsAttributesSchema = schema.object({
  title: schema.string({ meta: { description: 'A human-readable title for the dashboard' } }),
  description: schema.string({ defaultValue: '', meta: { description: 'A short description.' } }),
  timeRestore: schema.boolean({
    defaultValue: false,
    meta: { description: 'Whether to restore time upon viewing this dashboard' },
  }),
});

export const dashboardAttributesSchema = searchResultsAttributesSchema.extends({
  // Search
  kibanaSavedObjectMeta: schema.object(
    {
      searchSource: schema.maybe(searchSourceSchema),
    },
    {
      meta: {
        description: 'A container for various metadata',
      },
      defaultValue: {},
    }
  ),
  // Time
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
  panels: schema.arrayOf(panelSchema, { defaultValue: [] }),
  options: optionsSchema,
  version: schema.maybe(schema.number({ meta: { deprecated: true } })),
});

export const referenceSchema = schema.object(
  {
    name: schema.string(),
    type: schema.string(),
    id: schema.string(),
  },
  { unknowns: 'forbid' }
);

const dashboardAttributesSchemaResponse = dashboardAttributesSchema.extends({
  panels: schema.arrayOf(
    panelSchema.extends({
      // Responses always include the panel index and gridData.i
      panelIndex: schema.string(),
      gridData: gridDataSchema.extends({
        i: schema.string(),
      }),
    }),
    { defaultValue: [] }
  ),
});

export const dashboardItemSchema = schema.object(
  {
    id: schema.string(),
    type: schema.string(),
    version: schema.maybe(schema.string()),
    createdAt: schema.maybe(schema.string()),
    updatedAt: schema.maybe(schema.string()),
    createdBy: schema.maybe(schema.string()),
    updatedBy: schema.maybe(schema.string()),
    managed: schema.maybe(schema.boolean()),
    error: schema.maybe(apiError),
    attributes: dashboardAttributesSchemaResponse,
    references: schema.arrayOf(referenceSchema),
    namespaces: schema.maybe(schema.arrayOf(schema.string())),
    originId: schema.maybe(schema.string()),
  },
  { unknowns: 'allow' }
);

export const dashboardSearchResultsSchema = dashboardItemSchema.extends({
  attributes: searchResultsAttributesSchema,
});

export const dashboardSearchOptionsSchema = schema.maybe(
  schema.object(
    {
      onlyTitle: schema.maybe(schema.boolean()),
      fields: schema.maybe(schema.arrayOf(schema.string())),
      includeReferences: schema.maybe(schema.arrayOf(schema.oneOf([schema.literal('tag')]))),
      kuery: schema.maybe(schema.string()),
      cursor: schema.maybe(schema.number()),
      limit: schema.maybe(schema.number()),
    },
    { unknowns: 'forbid' }
  )
);

export const dashboardCreateOptionsSchema = schema.object({
  id: schema.maybe(createOptionsSchemas.id),
  overwrite: schema.maybe(createOptionsSchemas.overwrite),
  references: schema.maybe(schema.arrayOf(referenceSchema)),
  initialNamespaces: schema.maybe(createOptionsSchemas.initialNamespaces),
});

export const dashboardUpdateOptionsSchema = schema.object({
  references: schema.maybe(schema.arrayOf(referenceSchema)),
  mergeAttributes: schema.maybe(updateOptionsSchema.mergeAttributes),
});

export const dashboardGetResultSchema = schema.object(
  {
    item: dashboardItemSchema,
    meta: schema.object(
      {
        outcome: schema.oneOf([
          schema.literal('exactMatch'),
          schema.literal('aliasMatch'),
          schema.literal('conflict'),
        ]),
        aliasTargetId: schema.maybe(schema.string()),
        aliasPurpose: schema.maybe(
          schema.oneOf([
            schema.literal('savedObjectConversion'),
            schema.literal('savedObjectImport'),
          ])
        ),
      },
      { unknowns: 'forbid' }
    ),
  },
  { unknowns: 'forbid' }
);

export const dashboardCreateResultSchema = schema.object(
  {
    item: dashboardItemSchema,
  },
  { unknowns: 'forbid' }
);

export const serviceDefinition: ServicesDefinition = {
  get: {
    out: {
      result: {
        schema: dashboardGetResultSchema,
        down: getResultV3ToV2,
      },
    },
  },
  create: {
    in: {
      options: {
        schema: dashboardCreateOptionsSchema,
      },
      data: {
        schema: dashboardAttributesSchema,
      },
    },
    out: {
      result: {
        schema: dashboardCreateResultSchema,
      },
    },
  },
  update: {
    in: {
      options: {
        schema: dashboardUpdateOptionsSchema,
      },
      data: {
        schema: dashboardAttributesSchema,
      },
    },
  },
  search: {
    in: {
      options: {
        schema: dashboardSearchOptionsSchema,
      },
    },
  },
  mSearch: {
    out: {
      result: {
        schema: dashboardItemSchema,
      },
    },
  },
};
