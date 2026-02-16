/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';
import type { ContentManagementServicesDefinition as ServicesDefinition } from '@kbn/object-versioning';
import {
  savedObjectSchema,
  createResultSchema,
  updateOptionsSchema,
  createOptionsSchemas,
  objectTypeToGetResultSchema,
} from '@kbn/content-management-utils';
import { dashboardNavigationOptionsSchema } from '@kbn/dashboard-plugin/server';
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

export const dashboardLinkSchema = schema.object({
  ...baseLinkSchema,
  destination: schema.string({
    meta: { description: 'Linked dashboard saved object id' },
  }),
  type: schema.literal(DASHBOARD_LINK_TYPE),
  options: schema.maybe(dashboardNavigationOptionsSchema),
});

export const externalLinkSchema = schema.object({
  ...baseLinkSchema,
  type: schema.literal(EXTERNAL_LINK_TYPE),
  destination: schema.string({ meta: { description: 'The external URL to link to' } }),
  options: schema.maybe(
    schema.object(
      {
        openInNewTab: schema.maybe(
          schema.boolean({
            meta: {
              description: 'Whether to open this link in a new tab when clicked',
            },
          })
        ),
        encodeUrl: schema.maybe(
          schema.boolean({
            meta: {
              description: 'Whether to escape the URL with percent encoding',
            },
          })
        ),
      },
      { unknowns: 'forbid' }
    )
  ),
});

// Shared schema for links array - used by both saved objects and embeddables
export const linksArraySchema = schema.arrayOf(
  schema.oneOf([dashboardLinkSchema, externalLinkSchema]),
  {
    meta: { description: 'The list of links to display' },
  }
);

// Shared schema for layout - used by both saved objects and embeddables
export const layoutSchema = schema.maybe(
  schema.oneOf([schema.literal(LINKS_HORIZONTAL_LAYOUT), schema.literal(LINKS_VERTICAL_LAYOUT)], {
    meta: {
      description: 'Denote whether to display the links in a horizontal or vertical layout',
    },
  })
);

export const linksSchema = serializedTitlesSchema.extends(
  {
    links: linksArraySchema,
    layout: layoutSchema,
  },
  { unknowns: 'forbid' }
);

const linksSavedObjectSchema = savedObjectSchema(linksSchema);

export const linksSearchOptionsSchema = schema.maybe(
  schema.object(
    {
      onlyTitle: schema.maybe(schema.boolean()),
    },
    { unknowns: 'forbid' }
  )
);

export const linksCreateOptionsSchema = schema.object({
  overwrite: createOptionsSchemas.overwrite,
});

// update references needed because visualize listing table uses content management
// to update title/description/tags and tags passes references in this use case
// TODO remove linksUpdateOptionsSchema once visualize listing table updated to pass in tags without references
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
        schema: linksSchema,
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
        schema: linksUpdateOptionsSchema,
      },
      data: {
        schema: linksSchema,
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
