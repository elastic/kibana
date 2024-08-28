/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { schema } from '@kbn/config-schema';
import {
  createResultSchema,
  objectTypeToGetResultSchema,
  savedObjectSchema,
} from '@kbn/content-management-utils';
import { RawControlGroupAttributes } from '@kbn/controls-plugin/common';
import type { ContentManagementServicesDefinition as ServicesDefinition } from '@kbn/object-versioning';
import {
  controlGroupInputSchema as controlGroupInputSchemaV1,
  dashboardAttributesSchema as dashboardAttributesSchemaV1,
  serviceDefinition as serviceDefinitionV1,
} from '../v1';
import { DashboardAttributes, DashboardCrudTypes } from './types';
import {
  DashboardAttributes as DashboardAttributesV3,
  ControlGroupAttributes as ControlGroupAttributesV3,
} from '../v3';

export const dashboardAttributesSchema = dashboardAttributesSchemaV1.extends(
  {
    controlGroupInput: schema.maybe(
      controlGroupInputSchemaV1.extends(
        {
          showApplySelections: schema.maybe(schema.boolean()),
        },
        { unknowns: 'ignore' }
      )
    ),
  },
  { unknowns: 'ignore' }
);

export const dashboardSavedObjectSchema = savedObjectSchema(dashboardAttributesSchema);

const controlGroupInputUp = (
  controlGroupInput?: RawControlGroupAttributes
): ControlGroupAttributesV3 | undefined => {
  if (!controlGroupInput) {
    return;
  }
  const { panelsJSON, ignoreParentSettingsJSON, ...rest } = controlGroupInput;
  return {
    ...rest,
    panels: JSON.parse(panelsJSON),
    ignoreParentSettings: JSON.parse(ignoreParentSettingsJSON),
  };
};

const kibanaSavedObjectMetaUp = (
  kibanaSavedObjectMeta: DashboardAttributes['kibanaSavedObjectMeta']
) => {
  if (!kibanaSavedObjectMeta) return;
  const { searchSourceJSON, ...rest } = kibanaSavedObjectMeta;
  return {
    ...rest,
    searchSource: JSON.parse(searchSourceJSON),
  };
};

const dashboardAttributesUp = (
  attributes: DashboardAttributes | Partial<DashboardAttributes>
): DashboardAttributesV3 | Partial<DashboardAttributesV3> => {
  const { controlGroupInput, panelsJSON, optionsJSON, kibanaSavedObjectMeta, ...rest } = attributes;

  return {
    ...rest,
    ...(controlGroupInput && { controlGroupInput: controlGroupInputUp(controlGroupInput) }),
    ...(optionsJSON && { options: JSON.parse(optionsJSON) ?? {} }),
    ...(panelsJSON && { panels: JSON.parse(panelsJSON) ?? {} }),
    ...(kibanaSavedObjectMeta && {
      kibanaSavedObjectMeta: kibanaSavedObjectMetaUp(kibanaSavedObjectMeta),
    }),
    ...(controlGroupInput && { controlGroupInput: controlGroupInputUp(controlGroupInput) }),
  };
};

// Content management service definition.
export const serviceDefinition: ServicesDefinition = {
  get: {
    out: {
      result: {
        schema: objectTypeToGetResultSchema(dashboardSavedObjectSchema),
      },
    },
  },
  create: {
    in: {
      ...serviceDefinitionV1?.create?.in,
      data: {
        schema: dashboardAttributesSchema,
        up: (data: DashboardCrudTypes['CreateIn']['data']) => dashboardAttributesUp(data),
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
      ...serviceDefinitionV1.update?.in,
      data: {
        schema: dashboardAttributesSchema,
        up: (data: DashboardCrudTypes['UpdateIn']['data']) => dashboardAttributesUp(data),
      },
    },
  },
  search: {
    in: serviceDefinitionV1.search?.in,
  },
  mSearch: {
    out: {
      result: {
        schema: dashboardSavedObjectSchema,
      },
    },
  },
};
