/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import {
  createResultSchema,
  updateOptionsSchema,
  createOptionsSchemas,
  objectTypeToGetResultSchema,
} from '@kbn/content-management-utils';
import type { ContentManagementServicesDefinition as ServicesDefinition } from '@kbn/object-versioning';

import {
  dashboardLinkSchema as dashboardLinkSchemaV1,
  externalLinkSchema,
  savedObjectLinksAttributesSchema as linksAttributesSchemaV1,
} from '../../saved_objects/schema/v1';

const dashboardLinkSchema = schema.oneOf([
  dashboardLinkSchemaV1.extends({
    destinationRefName: schema.string({ meta: { deprecated: true } }),
  }),
  dashboardLinkSchemaV1.extends({
    destination: schema.string(),
  }),
]);

export const linksAttributesSchema = linksAttributesSchemaV1.extends({
  links: schema.arrayOf(schema.oneOf([dashboardLinkSchema, externalLinkSchema])),
});

const searchOptionsSchema = schema.maybe(
  schema.object(
    {
      onlyTitle: schema.maybe(schema.boolean()),
    },
    { unknowns: 'forbid' }
  )
);

const linksCreateOptionsSchema = schema.object({
  references: schema.maybe(createOptionsSchemas.references),
  overwrite: createOptionsSchemas.overwrite,
});

const linksUpdateOptionsSchema = schema.object({
  references: updateOptionsSchema.references,
});

export const serviceDefinition: ServicesDefinition = {
  get: {
    out: {
      result: {
        schema: objectTypeToGetResultSchema(linksAttributesSchema),
      },
    },
  },
  create: {
    in: {
      options: {
        schema: linksCreateOptionsSchema,
      },
      data: {
        schema: linksAttributesSchema,
      },
    },
    out: {
      result: {
        schema: createResultSchema(linksAttributesSchema),
      },
    },
  },
  update: {
    in: {
      options: {
        schema: linksUpdateOptionsSchema, // same schema as "create"
      },
      data: {
        schema: linksAttributesSchema,
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
        schema: linksAttributesSchema,
      },
    },
  },
};
