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
import type { ContentManagementServicesDefinition as ServicesDefinition } from '@kbn/object-versioning';
import { omit } from 'lodash';
import {
  controlGroupInputSchema as controlGroupInputSchemaV1,
  dashboardAttributesSchema as dashboardAttributesSchemaV1,
  DashboardCrudTypes as DashboardCrudTypesV1,
  serviceDefinition as serviceDefinitionV1,
} from '../v1';
import { DashboardCrudTypes as DashboardCrudTypesV2 } from './types';

export const dashboardAttributesSchema = dashboardAttributesSchemaV1.extends({
  controlGroupInput: schema.maybe(
    controlGroupInputSchemaV1.extends({
      showSelectionReset: schema.maybe(schema.boolean()),
      showApplySelections: schema.maybe(schema.boolean()),
    })
  ),
});

export const dashboardSavedObjectSchema = savedObjectSchema(dashboardAttributesSchema);

// Content management service definition.
export const serviceDefinition: ServicesDefinition = {
  get: {
    out: {
      result: {
        schema: objectTypeToGetResultSchema(dashboardSavedObjectSchema),
        down: (result: DashboardCrudTypesV2['GetOut']): DashboardCrudTypesV1['GetOut'] => {
          // Down transform the result to "v1" version
          return {
            ...result,
            item: {
              ...result.item,
              attributes: {
                ...result.item.attributes,
                controlGroupInput: omit(result.item.attributes.controlGroupInput, [
                  'showSelectionReset',
                  'showApplySelections',
                ]),
              },
            },
          };
        },
      },
    },
  },
  create: {
    in: {
      ...serviceDefinitionV1?.create?.in,
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
      ...serviceDefinitionV1.update?.in,
      data: {
        schema: dashboardAttributesSchema,
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
