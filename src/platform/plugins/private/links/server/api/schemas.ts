/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod';
import { getAsCodeTagsSchema } from '@kbn/as-code-shared-schemas';
import { dashboardNavigationOptionsSchema } from '@kbn/dashboard-navigation-options-schema';
import {
  BY_REF_SCHEMA_META,
  BY_VALUE_SCHEMA_META,
  serializedTitlesSchema,
} from '@kbn/presentation-publishing-schemas';
import {
  DASHBOARD_LINK_TYPE,
  DEFAULT_EXTERNAL_LINK_OPTIONS,
  EXTERNAL_LINK_TYPE,
  LINKS_HORIZONTAL_LAYOUT,
  LINKS_VERTICAL_LAYOUT,
} from '../../common/constants';

const baseLinkSchemaShape = {
  label: z.string().optional().meta({ description: 'The label of the link displayed in the UI.' }),
};

export const dashboardLinkSchema = lazySchema(() =>
  z
    .object({
      ...baseLinkSchemaShape,
      type: z.literal(DASHBOARD_LINK_TYPE),
      destination: z.string().meta({ description: 'Linked dashboard saved object ID.' }),
      options: dashboardNavigationOptionsSchema,
    })
    .strict()
    .meta({
      description: 'Link type. Set to dashboardLink for a link to another dashboard.',
      id: `kbn-link-panel-type-${DASHBOARD_LINK_TYPE}`,
    })
);

export const externalLinkOptionsSchema = lazySchema(() =>
  z
    .object({
      open_in_new_tab: z.boolean().default(DEFAULT_EXTERNAL_LINK_OPTIONS.open_in_new_tab).meta({
        description: 'Whether to open this link in a new tab when clicked.',
      }),
      encode_url: z.boolean().default(DEFAULT_EXTERNAL_LINK_OPTIONS.encode_url).meta({
        description: 'Whether to escape the URL with percent encoding',
      }),
    })
    .strict()
    .default(DEFAULT_EXTERNAL_LINK_OPTIONS)
);

export const externalLinkSchema = lazySchema(() =>
  z
    .object({
      ...baseLinkSchemaShape,
      type: z.literal(EXTERNAL_LINK_TYPE),
      destination: z.string().meta({ description: 'The external URL to link to.' }),
      options: externalLinkOptionsSchema,
    })
    .strict()
    .meta({
      id: `kbn-link-type-${EXTERNAL_LINK_TYPE}`,
      description: 'Link type. Set to externalLink for a URL outside Kibana.',
    })
);

export const linksArraySchema = lazySchema(() =>
  z
    .array(z.discriminatedUnion('type', [dashboardLinkSchema, externalLinkSchema]))
    .max(100)
    .meta({ description: 'The list of links to display.' })
);

// Shared schema for layout - used by both saved objects and embeddables
export const layoutSchema = lazySchema(() =>
  z.enum([LINKS_HORIZONTAL_LAYOUT, LINKS_VERTICAL_LAYOUT]).optional().meta({
    description: 'Whether to display the links in a horizontal or vertical layout.',
  })
);

const linksStateSchema = lazySchema(() =>
  z
    .object({
      links: linksArraySchema,
      layout: layoutSchema,
    })
    .strict()
);

export const linksByValueSchema = lazySchema(() =>
  serializedTitlesSchema.extend(linksStateSchema.shape).meta(BY_VALUE_SCHEMA_META)
);

export const linksByReferenceSchema = lazySchema(() =>
  serializedTitlesSchema
    .extend({
      ref_id: z.string().meta({
        title: 'Reference ID',
        description: 'The unique identifier of the links library item.',
      }),
    })
    .meta(BY_REF_SCHEMA_META)
);

// Complete links embeddable schema (union of by-value and by-reference embeddables)
export const linksEmbeddableSchema = lazySchema(() =>
  z.union([linksByValueSchema, linksByReferenceSchema]).meta({
    description: 'Links embeddable schema',
  })
);

export const linksApiStateSchema = lazySchema(() =>
  linksStateSchema.extend({
    title: z.string(), // title is required - all links library items must have a title
    description: z.string().optional(), // description of links library item is optional
    tags: getAsCodeTagsSchema().optional(),
  })
);
