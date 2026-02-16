/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { ContentManagementServicesDefinition as ServicesDefinition } from '@kbn/object-versioning';
import {
  savedObjectSchema,
  objectTypeToGetResultSchema,
  createOptionsSchemas,
  updateOptionsSchema,
  createResultSchema,
} from '@kbn/content-management-utils';
import { SCHEMA_SEARCH_MODEL_VERSION_10 } from '../../../saved_objects/schema';

const savedSearchSavedObjectSchema = savedObjectSchema(SCHEMA_SEARCH_MODEL_VERSION_10);

const savedSearchCreateOptionsSchema = schema.maybe(
  schema.object({
    id: createOptionsSchemas.id,
    references: createOptionsSchemas.references,
    overwrite: createOptionsSchemas.overwrite,
  })
);

const savedSearchUpdateOptionsSchema = schema.maybe(
  schema.object({
    references: updateOptionsSchema.references,
  })
);
const savedSearchSearchOptionsSchema = schema.maybe(
  schema.object({
    searchFields: schema.maybe(schema.arrayOf(schema.string())),
    fields: schema.maybe(schema.arrayOf(schema.string())),
  })
);

// Content management service definition.
// We need it for BWC support between different versions of the content
export const serviceDefinition: ServicesDefinition = {
  get: {
    out: {
      result: {
        schema: objectTypeToGetResultSchema(savedSearchSavedObjectSchema),
      },
    },
  },
  create: {
    in: {
      options: {
        schema: savedSearchCreateOptionsSchema,
      },
      data: {
        schema: SCHEMA_SEARCH_MODEL_VERSION_10,
      },
    },
    out: {
      result: {
        schema: createResultSchema(savedSearchSavedObjectSchema),
      },
    },
  },
  update: {
    in: {
      options: {
        schema: savedSearchUpdateOptionsSchema,
      },
      data: {
        schema: SCHEMA_SEARCH_MODEL_VERSION_10,
      },
    },
  },
  search: {
    in: {
      options: {
        schema: savedSearchSearchOptionsSchema,
      },
    },
  },
  mSearch: {
    out: {
      result: {
        schema: savedSearchSavedObjectSchema,
      },
    },
  },
};
