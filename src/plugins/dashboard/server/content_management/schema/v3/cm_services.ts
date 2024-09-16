/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, Type, TypeOf } from '@kbn/config-schema';
import {
  createOptionsSchemas,
  createResultSchema,
  objectTypeToGetResultSchema,
  savedObjectSchema,
  updateOptionsSchema,
} from '@kbn/content-management-utils';
import type { ContentManagementServicesDefinition as ServicesDefinition } from '@kbn/object-versioning';
import {
  type ControlGroupChainingSystem,
  type ControlStyle,
  type ControlWidth,
  CONTROL_CHAINING_OPTIONS,
  CONTROL_STYLE_OPTIONS,
  CONTROL_WIDTH_OPTIONS,
  DEFAULT_CONTROL_CHAINING,
  DEFAULT_CONTROL_GROW,
  DEFAULT_CONTROL_STYLE,
  DEFAULT_CONTROL_WIDTH,
} from '@kbn/controls-plugin/common';
import { FilterStateStore } from '@kbn/es-query';
import { SortDirection } from '@kbn/data-plugin/common/search';
import type { DashboardCrudTypes } from '../../../../common/content_management/v3';
import type { DashboardCrudTypes as DashboardCrudTypesV2 } from '../../../../common/content_management/v2';
import {
  DASHBOARD_GRID_COLUMN_COUNT,
  DEFAULT_PANEL_HEIGHT,
  DEFAULT_PANEL_WIDTH,
} from '../../../../common/content_management';
import { itemAttrsToSavedObjectAttrs } from './storage_transforms';

export const controlGroupInputSchema = schema.object({
  panels: schema.arrayOf(
    schema.object(
      {
        type: schema.string({ meta: { description: 'The type of the control panel.' } }),
        embeddableConfig: schema.object(
          {
            id: schema.maybe(
              schema.string({
                meta: { description: 'The id of the control panel.' },
              })
            ),
          },
          {
            unknowns: 'allow',
            meta: { description: 'Embeddable input for the control.' },
          }
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
  controlStyle: schema.oneOf(
    Object.values(CONTROL_STYLE_OPTIONS).map((value) => schema.literal(value)) as [
      Type<ControlStyle>
    ],
    {
      defaultValue: DEFAULT_CONTROL_STYLE,
      meta: { description: 'Style of the controls. For example, "oneLine", "twoLine".' },
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
  ignoreParentSettings: schema.maybe(
    schema.object({
      ignoreFilters: schema.maybe(
        schema.boolean({
          meta: { description: 'Ignore global filters in controls.' },
        })
      ),
      ignoreQuery: schema.maybe(
        schema.boolean({
          meta: { description: 'Ignore the global query bar in controls.' },
        })
      ),
      ignoreTimerange: schema.maybe(
        schema.boolean({
          meta: { description: 'Ignore the global time range in controls.' },
        })
      ),
      ignoreValidations: schema.maybe(
        schema.boolean({
          meta: { description: 'Ignore validations in controls.' },
        })
      ),
    })
  ),
  showApplySelections: schema.maybe(
    schema.boolean({
      meta: { description: 'Show apply selections button in controls.' },
    })
  ),
});

const searchSourceSchema = schema.object(
  {
    type: schema.maybe(schema.string()),
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
        schema.object(
          {
            meta: schema.object({
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
            }),
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
  { defaultValue: {} }
);

const gridDataSchema = schema.object({
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

const panelsSchema = schema.arrayOf(
  schema.object({
    embeddableConfig: schema.object(
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
        // id: schema.string({
        //   defaultValue: uuidv4(),
        //   meta: { description: 'The id of the panel' },
        // }),
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
            "The version was used to store Kibana version information from versions 7.3.0 -> 8.11.0. As of version 8.11.0, the versioning information is now per-embeddable-type and is stored on the embeddable's input. (embeddableConfig in this type).",
          deprecated: true,
        },
      })
    ),
  }),
  { defaultValue: [] }
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

export const generalAttributesSchema = schema.object({
  title: schema.string({ meta: { description: 'A human-readable title for the dashboard' } }),
  description: schema.string({ defaultValue: '', meta: { description: 'A short description.' } }),
});

export const dashboardAttributesSchema = generalAttributesSchema.extends({
  // Search
  kibanaSavedObjectMeta: schema.object(
    {
      searchSource: schema.maybe(searchSourceSchema),
    },
    {
      meta: {
        description: 'A container for various metadata',
      },
    }
  ),

  // Time
  timeRestore: schema.boolean({
    defaultValue: false,
    meta: { description: 'Whether to restore time upon viewing this dashboard' },
  }),
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
  version: schema.number({ meta: { deprecated: true } }),
});

export type DashboardAttributes = TypeOf<typeof dashboardAttributesSchema>;
export type ControlGroupAttributes = TypeOf<typeof controlGroupInputSchema>;
export type GridData = TypeOf<typeof gridDataSchema>;

// TODO the savedObjectSchema function is a misnomer as the actual output schema is
// the dashboard attributes (not saved object attributes) wrapped by saved object metadata.
export const dashboardItemSchema = savedObjectSchema(dashboardAttributesSchema);

const searchOptionsSchema = schema.maybe(
  schema.object(
    {
      onlyTitle: schema.maybe(schema.boolean()),
      allFields: schema.maybe(schema.boolean()),
      kuery: schema.maybe(schema.string()),
      cursor: schema.maybe(schema.number()),
      limit: schema.maybe(schema.number()),
    },
    { unknowns: 'forbid' }
  )
);

const createOptionsSchema = schema.object({
  id: schema.maybe(createOptionsSchemas.id),
  overwrite: schema.maybe(createOptionsSchemas.overwrite),
  references: schema.maybe(createOptionsSchemas.references),
  initialNamespaces: schema.maybe(createOptionsSchemas.initialNamespaces),
});

const dashboardUpdateOptionsSchema = schema.object({
  references: schema.maybe(updateOptionsSchema.references),
  mergeAttributes: schema.maybe(updateOptionsSchema.mergeAttributes),
});

export const serviceDefinition: ServicesDefinition = {
  get: {
    out: {
      result: {
        schema: objectTypeToGetResultSchema(dashboardItemSchema),
        down: (result: DashboardCrudTypes['GetOut']): DashboardCrudTypesV2['GetOut'] => {
          const { attributes, ...rest } = result.item;
          const soAttributes = itemAttrsToSavedObjectAttrs(attributes);
          return {
            ...result,
            item: {
              ...rest,
              attributes: soAttributes,
            },
          };
        },
      },
    },
  },
  create: {
    in: {
      options: {
        schema: createOptionsSchema,
      },
      data: {
        schema: dashboardAttributesSchema,
      },
    },
    out: {
      result: {
        schema: createResultSchema(dashboardItemSchema),
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
        schema: searchOptionsSchema,
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
