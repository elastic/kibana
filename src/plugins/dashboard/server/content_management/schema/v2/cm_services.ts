/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  createResultSchema,
  objectTypeToGetResultSchema,
  savedObjectSchema,
} from '@kbn/content-management-utils';
import type { ContentManagementServicesDefinition as ServicesDefinition } from '@kbn/object-versioning';
import type { DashboardCrudTypes } from '../../../../common/content_management/v2';
import { serviceDefinition as serviceDefinitionV1 } from '../v1';
import { dashboardAttributesOut as attributesTov3 } from '../v3';
import { dashboardAttributesSchema } from '../../../dashboard_saved_object/schema/v2';

export const dashboardSavedObjectSchema = savedObjectSchema(dashboardAttributesSchema);

/**
 * Content management service definition v2.
 * Dashboard attributes in content management version v2 are tightly coupled with the v2 model version saved object schema.
 */
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
        up: (data: DashboardCrudTypes['CreateIn']['data']) => attributesTov3(data),
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
        up: (data: DashboardCrudTypes['UpdateIn']['data']) => attributesTov3(data),
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
