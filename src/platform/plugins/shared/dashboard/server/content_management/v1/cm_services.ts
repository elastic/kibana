/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContentManagementServicesDefinition as ServicesDefinition } from '@kbn/object-versioning';
import { schema } from '@kbn/config-schema';
import {
  getDashboardGetResultSchema,
  dashboardCreateOptionsSchema,
  dashboardUpdateOptionsSchema,
  getDashboardUpdateRequestAttributesSchema,
  dashboardSearchOptionsSchema,
  getDashboardItemSchema,
  getDashboardStateSchema,
} from './schema';

export function getServiceDefinition(): ServicesDefinition {
  return {
    get: {
      out: {
        result: {
          schema: getDashboardGetResultSchema(),
        },
      },
    },
    create: {
      in: {
        options: {
          schema: dashboardCreateOptionsSchema,
        },
        data: {
          schema: schema.object(getDashboardStateSchema()),
        },
      },
      out: {
        result: {
          schema: getDashboardItemSchema(),
        },
      },
    },
    update: {
      in: {
        options: {
          schema: dashboardUpdateOptionsSchema,
        },
        data: {
          schema: getDashboardUpdateRequestAttributesSchema(),
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
  };
}
