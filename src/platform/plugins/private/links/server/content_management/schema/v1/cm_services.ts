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
  createResultSchema,
  updateOptionsSchema,
  createOptionsSchemas,
  objectTypeToGetResultSchema,
} from '@kbn/content-management-utils';
import { DASHBOARD_LINK_TYPE, EXTERNAL_LINK_TYPE } from '../../../../common/content_management/v1';
import {
  LINKS_HORIZONTAL_LAYOUT,
  LINKS_VERTICAL_LAYOUT,
} from '../../../../common/content_management/v1/constants';

const baseLinkSchema = {
  id: schema.string({ meta: { description: 'The unique ID of the link' } }),
  label: schema.maybe(
    schema.string({ meta: { description: 'The label of the link to be displayed in the UI' } })
  ),
  order: schema.number({
    meta: { description: 'The position this link should appear in the order of the list' },
  }),
};

const dashboardLinkSchema = schema.object({
  ...baseLinkSchema,
  destinationRefName: schema.string({
    meta: { description: 'The name of the SavedObject reference to the linked dashboard' },
  }),
  type: schema.literal(DASHBOARD_LINK_TYPE),
  options: schema.maybe(
    schema.object(
      {
        openInNewTab: schema.boolean({
          meta: {
            description: 'Whether to open this link in a new tab when clicked',
          },
        }),
        useCurrentFilters: schema.boolean({
          meta: {
            description: 'Whether to use the filters and query from the origin dashboard',
          },
        }),
        useCurrentDateRange: schema.boolean({
          meta: {
            description: 'Whether to use the date range from the origin dashboard',
          },
        }),
      },
      { unknowns: 'forbid' }
    )
  ),
});

const externalLinkSchema = schema.object({
  ...baseLinkSchema,
  type: schema.literal(EXTERNAL_LINK_TYPE),
  destination: schema.string({ meta: { description: 'The external URL to link to' } }),
  options: schema.maybe(
    schema.object(
      {
        openInNewTab: schema.boolean({
          meta: {
            description: 'Whether to open this link in a new tab when clicked',
          },
        }),
        encodeUrl: schema.boolean({
          meta: {
            description: 'Whether to escape the URL with percent encoding',
          },
        }),
      },
      { unknowns: 'forbid' }
    )
  ),
});

export const linksAttributesSchema = schema.object(
  {
    title: schema.string({ meta: { description: 'A human-readable title for the dashboard' } }),
    description: schema.maybe(schema.string({ meta: { description: 'A short description.' } })),
    links: schema.arrayOf(schema.oneOf([dashboardLinkSchema, externalLinkSchema]), {
      meta: { description: 'The list of links to display' },
    }),
    layout: schema.maybe(
      schema.oneOf(
        [schema.literal(LINKS_HORIZONTAL_LAYOUT), schema.literal(LINKS_VERTICAL_LAYOUT)],
        {
          meta: {
            description: 'Denote whether to display the links in a horizontal or vertical layout',
          },
        }
      )
    ),
  },
  { unknowns: 'forbid' }
);

const linksSavedObjectSchema = savedObjectSchema(linksAttributesSchema);

export const linksSearchOptionsSchema = schema.maybe(
  schema.object(
    {
      onlyTitle: schema.maybe(schema.boolean()),
    },
    { unknowns: 'forbid' }
  )
);

export const linksCreateOptionsSchema = schema.object({
  references: schema.maybe(createOptionsSchemas.references),
  overwrite: createOptionsSchemas.overwrite,
});

export const linksUpdateOptionsSchema = schema.object({
  references: updateOptionsSchema.references,
});

export const linksGetResultSchema = objectTypeToGetResultSchema(linksSavedObjectSchema);
export const linksCreateResultSchema = createResultSchema(linksSavedObjectSchema);

// Content management service definition.
// We need it for BWC support between different versions of the content
export const serviceDefinition: ServicesDefinition = {
  get: {
    out: {
      result: {
        schema: linksGetResultSchema,
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
        schema: linksCreateResultSchema,
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
        schema: linksSearchOptionsSchema,
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
