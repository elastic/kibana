/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import type { ContentManagementServicesDefinition as ServicesDefinition } from '@kbn/object-versioning';
import {
  savedObjectSchema,
  createResultSchema,
  updateOptionsSchema,
  createOptionsSchemas,
  objectTypeToGetResultSchema,
} from '@kbn/content-management-utils';
import { DASHBOARD_LINK_TYPE, EXTERNAL_LINK_TYPE } from '.';
import {
  EXTERNAL_LINK_SUPPORTED_PROTOCOLS,
  NAV_HORIZONTAL_LAYOUT,
  NAV_VERTICAL_LAYOUT,
} from './constants';

const baseNavigationEmbeddableLinkSchema = {
  id: schema.string(),
  label: schema.maybe(schema.string()),
  order: schema.number(),
};

const dashboardLinkSchema = schema.object({
  ...baseNavigationEmbeddableLinkSchema,
  destinationRefName: schema.string(),
  type: schema.literal(DASHBOARD_LINK_TYPE),
});

const externalLinkSchema = schema.object({
  ...baseNavigationEmbeddableLinkSchema,
  type: schema.literal(EXTERNAL_LINK_TYPE),
  destination: schema.uri({ scheme: EXTERNAL_LINK_SUPPORTED_PROTOCOLS }),
});

const navigationEmbeddableAttributesSchema = schema.object(
  {
    title: schema.string(),
    description: schema.maybe(schema.string()),
    links: schema.arrayOf(schema.oneOf([dashboardLinkSchema, externalLinkSchema])),
    layout: schema.maybe(
      schema.oneOf([schema.literal(NAV_HORIZONTAL_LAYOUT), schema.literal(NAV_VERTICAL_LAYOUT)])
    ),
  },
  { unknowns: 'forbid' }
);

const navigationEmbeddableSavedObjectSchema = savedObjectSchema(
  navigationEmbeddableAttributesSchema
);

const searchOptionsSchema = schema.maybe(
  schema.object(
    {
      onlyTitle: schema.maybe(schema.boolean()),
    },
    { unknowns: 'forbid' }
  )
);

const navigationEmbeddableCreateOptionsSchema = schema.object({
  references: schema.maybe(createOptionsSchemas.references),
  overwrite: createOptionsSchemas.overwrite,
});

const navigationEmbeddableUpdateOptionsSchema = schema.object({
  references: updateOptionsSchema.references,
});

// Content management service definition.
// We need it for BWC support between different versions of the content
export const serviceDefinition: ServicesDefinition = {
  get: {
    out: {
      result: {
        schema: objectTypeToGetResultSchema(navigationEmbeddableSavedObjectSchema),
      },
    },
  },
  create: {
    in: {
      options: {
        schema: navigationEmbeddableCreateOptionsSchema,
      },
      data: {
        schema: navigationEmbeddableAttributesSchema,
      },
    },
    out: {
      result: {
        schema: createResultSchema(navigationEmbeddableSavedObjectSchema),
      },
    },
  },
  update: {
    in: {
      options: {
        schema: navigationEmbeddableUpdateOptionsSchema, // same schema as "create"
      },
      data: {
        schema: navigationEmbeddableAttributesSchema,
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
        schema: navigationEmbeddableSavedObjectSchema,
      },
    },
  },
};
