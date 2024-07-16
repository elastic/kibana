/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { v4 as uuidv4 } from 'uuid';
import { schema, Type } from '@kbn/config-schema';
import {
  createResultSchema,
  objectTypeToGetResultSchema,
  savedObjectSchema,
} from '@kbn/content-management-utils';
import type { ContentManagementServicesDefinition as ServicesDefinition } from '@kbn/object-versioning';
import {
  ControlGroupChainingSystem,
  ControlStyle,
  CONTROL_WIDTH_OPTIONS,
  DEFAULT_CONTROL_CHAINING,
  DEFAULT_CONTROL_GROW,
  DEFAULT_CONTROL_STYLE,
  DEFAULT_CONTROL_WIDTH,
  RawControlGroupAttributes,
} from '@kbn/controls-plugin/common';
import { ControlWidth } from '@kbn/controls-plugin/common';
import { CONTROL_CHAINING_OPTIONS, CONTROL_STYLE_OPTIONS } from '@kbn/controls-plugin/common';
import { ControlGroupAttributes, DashboardCrudTypes } from './types';
import {
  DashboardCrudTypes as DashboardCrudTypesV2,
  serviceDefinition as serviceDefinitionV2,
} from '../v2';

export const controlGroupInputSchema = schema.object({
  panels: schema.recordOf(
    schema.string(),
    schema.object(
      {
        type: schema.string({ meta: { description: 'The type of the control panel.' } }),
        explicitInput: schema.object(
          {
            id: schema.string({ meta: { description: 'The id of the control panel.' } }),
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
      defaultValue: {},
      meta: { description: 'A record of control panels and their state in the control group.' },
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
  },
  { defaultValue: {} }
);

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
      i: schema.string({
        defaultValue: uuidv4(),
        meta: { description: 'The unique identifier of the panel' },
      }),
    }),
    // TODO validate that the panelIndex and gridData.id are identical
    panelIndex: schema.string({
      defaultValue: schema.siblingRef('gridData.id'),
      meta: { description: 'The unique identifier of the panel' },
    }),
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

export const dashboardAttributesSchema = schema.object({
  // General
  title: schema.string({ meta: { description: 'A human-readable title for the dashboard' } }),
  description: schema.string({ defaultValue: '', meta: { description: 'A short description.' } }),

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

export const dashboardSavedObjectSchema = savedObjectSchema(dashboardAttributesSchema);

const controlGroupInputDown = (
  controlGroupInput?: ControlGroupAttributes
): RawControlGroupAttributes | undefined => {
  if (!controlGroupInput) {
    return;
  }
  const { panels, ignoreParentSettings, ...rest } = controlGroupInput;
  return {
    ...rest,
    panelsJSON: JSON.stringify(panels),
    ignoreParentSettingsJSON: JSON.stringify(ignoreParentSettings),
  };
};

export const serviceDefinition: ServicesDefinition = {
  get: {
    out: {
      result: {
        schema: objectTypeToGetResultSchema(dashboardSavedObjectSchema),
        down: (result: DashboardCrudTypes['GetOut']): DashboardCrudTypesV2['GetOut'] => {
          const { attributes, ...rest } = result.item;
          const { controlGroupInput, panels, options, kibanaSavedObjectMeta, ...restAttributes } =
            attributes;
          return {
            ...result,
            item: {
              ...rest,
              attributes: {
                ...restAttributes,
                ...controlGroupInputDown(controlGroupInput),
                panelsJSON: JSON.stringify(panels),
                optionsJSON: JSON.stringify(options),
                kibanaSavedObjectMeta: {
                  ...(kibanaSavedObjectMeta.searchSource && {
                    searchSourceJSON: JSON.stringify(kibanaSavedObjectMeta.searchSource),
                  }),
                },
              },
            },
          };
        },
      },
    },
  },
  create: {
    in: {
      ...serviceDefinitionV2.create?.in,
      data: {
        schema: dashboardAttributesSchema,
      },
    },
    out: {
      result: {
        schema: createResultSchema(dashboardSavedObjectSchema),
      },
    },
  },
  update: {
    in: {
      ...serviceDefinitionV2.update?.in,
      data: {
        schema: dashboardAttributesSchema,
      },
    },
  },
  search: {
    in: serviceDefinitionV2.search?.in,
  },
  mSearch: {
    out: {
      result: {
        schema: dashboardSavedObjectSchema,
      },
    },
  },
};
