/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';
import type { ContentManagementServicesDefinition as ServicesDefinition } from '@kbn/object-versioning';
import {
  savedObjectSchema,
  createResultSchema,
  updateOptionsSchema,
  createOptionsSchema,
  objectTypeToGetResultSchema,
} from '@kbn/content-management-utils/zod';
import { dashboardNavigationOptionsSchema } from '@kbn/dashboard-navigation-options-schema';
import { DEFAULT_EXTERNAL_LINK_OPTIONS } from '../../../../common/constants';
import { DASHBOARD_LINK_TYPE, EXTERNAL_LINK_TYPE } from '../../../../common/content_management/v1';
import {
  LINKS_HORIZONTAL_LAYOUT,
  LINKS_VERTICAL_LAYOUT,
} from '../../../../common/content_management/v1/constants';

const baseLinkSchema = z
  .object({
    label: z
      .string()
      .optional()
      .meta({ description: 'The label of the link to be displayed in the UI' }),
  })
  .strict();

export const dashboardLinkSchema = baseLinkSchema
  .extend({
    destination: z.string().meta({ description: 'Linked dashboard saved object id' }),
    type: z.literal(DASHBOARD_LINK_TYPE),
    options: dashboardNavigationOptionsSchema,
  })
  .strict()
  .meta({
    id: `kbn-link-panel-type-${DASHBOARD_LINK_TYPE}`,
  });

export const externalLinkOptionsSchema = z
  .object({
    open_in_new_tab: z.boolean().default(DEFAULT_EXTERNAL_LINK_OPTIONS.open_in_new_tab).meta({
      description: 'Whether to open this link in a new tab when clicked',
    }),
    encode_url: z.boolean().default(DEFAULT_EXTERNAL_LINK_OPTIONS.encode_url).meta({
      description: 'Whether to escape the URL with percent encoding',
    }),
  })
  .strict()
  .default(DEFAULT_EXTERNAL_LINK_OPTIONS);

export const externalLinkSchema = baseLinkSchema
  .extend({
    type: z.literal(EXTERNAL_LINK_TYPE),
    destination: z.string().meta({ description: 'The external URL to link to' }),
    options: externalLinkOptionsSchema,
  })
  .strict()
  .meta({
    id: `kbn-link-type-${EXTERNAL_LINK_TYPE}`,
  });

export const linksArraySchema = z
  .array(z.discriminatedUnion('type', [dashboardLinkSchema, externalLinkSchema]))
  .max(100)
  .meta({ description: 'The list of links to display' });

// Shared schema for layout - used by both saved objects and embeddables
export const layoutSchema = z
  .union([z.literal(LINKS_HORIZONTAL_LAYOUT), z.literal(LINKS_VERTICAL_LAYOUT)])
  .optional()
  .meta({
    description: 'Denote whether to display the links in a horizontal or vertical layout',
  });

export const linksSchema = serializedTitlesSchema
  .extend({
    links: linksArraySchema,
    layout: layoutSchema,
  })
  .strict();

const linksSavedObjectSchema = savedObjectSchema(linksSchema);

export const linksSearchOptionsSchema = z
  .object({
    onlyTitle: z.boolean().optional(),
  })
  .strict()
  .optional();

export const linksCreateOptionsSchema = z
  .object({
    overwrite: createOptionsSchema.shape.overwrite,
  })
  .strict();

// update references needed because visualize listing table uses content management
// to update title/description/tags and tags passes references in this use case
// TODO remove linksUpdateOptionsSchema once visualize listing table updated to pass in tags without references
export const linksUpdateOptionsSchema = z
  .object({
    references: updateOptionsSchema.shape.references,
  })
  .strict();

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
