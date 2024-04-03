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
import { LINKS_HORIZONTAL_LAYOUT, LINKS_VERTICAL_LAYOUT } from './constants';

const baseLinkSchema = {
  id: schema.string(),
  label: schema.maybe(schema.string()),
  order: schema.number(),
};

const dashboardLinkSchema = schema.object({
  ...baseLinkSchema,
  destinationRefName: schema.string(),
  type: schema.literal(DASHBOARD_LINK_TYPE),
  options: schema.maybe(
    schema.object(
      {
        openInNewTab: schema.boolean(),
        useCurrentFilters: schema.boolean(),
        useCurrentDateRange: schema.boolean(),
      },
      { unknowns: 'forbid' }
    )
  ),
});

const externalLinkSchema = schema.object({
  ...baseLinkSchema,
  type: schema.literal(EXTERNAL_LINK_TYPE),
  destination: schema.string(),
  options: schema.maybe(
    schema.object(
      {
        openInNewTab: schema.boolean(),
        encodeUrl: schema.boolean(),
      },
      { unknowns: 'forbid' }
    )
  ),
});

const linksAttributesSchema = schema.object(
  {
    title: schema.string(),
    description: schema.maybe(schema.string()),
    links: schema.arrayOf(schema.oneOf([dashboardLinkSchema, externalLinkSchema])),
    layout: schema.maybe(
      schema.oneOf([schema.literal(LINKS_HORIZONTAL_LAYOUT), schema.literal(LINKS_VERTICAL_LAYOUT)])
    ),
  },
  { unknowns: 'forbid' }
);

const linksSavedObjectSchema = savedObjectSchema(linksAttributesSchema);

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

// Content management service definition.
// We need it for BWC support between different versions of the content
export const serviceDefinition: ServicesDefinition = {
  get: {
    out: {
      result: {
        schema: objectTypeToGetResultSchema(linksSavedObjectSchema),
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
        schema: createResultSchema(linksSavedObjectSchema),
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
        schema: linksSavedObjectSchema,
      },
    },
  },
};
