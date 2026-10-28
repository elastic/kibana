/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import {
  asCodeMetaSchema,
  asCodePaginationResponseMetaSchema,
  getAsCodeSearchRequestSchema,
  getAsCodeTagsSchema,
  PAGINATION_MAX_SIZE,
} from '@kbn/as-code-shared-schemas';
import type { discoverSessionApiControlPanelsSchema } from '@kbn/as-code-discover-schema';
import { discoverSessionApiDataSchema } from '@kbn/as-code-discover-schema';
import {
  MAX_DISCOVER_SESSION_TAGS,
  MAX_SEARCH_QUERY_LENGTH,
} from '@kbn/discover-session-constants';

export const discoverSessionApiResponseSchema = z
  .object({
    id: z.string().meta({ description: 'The Discover session ID.' }),
    data: discoverSessionApiDataSchema,
    meta: asCodeMetaSchema,
  })
  .strict();

/* Shared context for warnings produced while transforming a Discover session tab. */
const discoverSessionWarningBaseSchema = z.object({
  message: z.string().meta({ description: 'The reason the content was dropped.' }),
  tab_id: z.string().meta({ description: 'The ID of the tab that contains the dropped content.' }),
});

const discoverSessionDroppedItemWarningSchema = discoverSessionWarningBaseSchema
  .extend({
    type: z.literal('dropped_item'),
    key: z
      .string()
      .meta({ description: 'The name of the property that contains the dropped item.' }),
    item_id: z.string().meta({ description: 'The ID of the dropped item.' }),
    item_type: z
      .string()
      .optional()
      .meta({ description: 'The type identifier of the dropped item, when available.' }),
    item_config: z
      .object({})
      .loose()
      .optional()
      .meta({ description: 'The original configuration of the dropped item.' }),
  })
  .strict()
  .meta({
    id: 'kbn-discover-session-dropped-item-warning',
    title: 'Dropped item',
    description:
      'An item in a tab that was excluded from the response because it failed validation.',
  });

const discoverSessionDroppedPropertyWarningSchema = discoverSessionWarningBaseSchema
  .extend({
    type: z.literal('dropped_property'),
    key: z.string().meta({ description: 'The name of the property that was dropped.' }),
    value: z
      .unknown()
      .optional()
      .meta({ description: 'The original value of the property that was dropped.' }),
  })
  .strict()
  .meta({
    id: 'kbn-discover-session-dropped-property-warning',
    title: 'Dropped property',
    description: 'A tab property excluded from the response due to malformed data.',
  });

/* Allows GET responses to preserve valid session data while reporting what was dropped. */
export const discoverSessionWarningsSchema = z
  .array(
    z.union([discoverSessionDroppedItemWarningSchema, discoverSessionDroppedPropertyWarningSchema])
  )
  .meta({
    description:
      'Warnings about content omitted from the API response due to conversion or validation errors. The saved session is not modified.',
  });

export const discoverSessionGetResponseSchema = discoverSessionApiResponseSchema.extend({
  warnings: discoverSessionWarningsSchema.optional(),
});

export const discoverSessionSanitizeResponseSchema = z
  .object({
    data: discoverSessionApiDataSchema,
    warnings: discoverSessionWarningsSchema.optional(),
  })
  .strict();

export const discoverSessionSearchRequestParamsSchema = getAsCodeSearchRequestSchema({
  tags: {
    description:
      'A tag ID to include. Accepts a single tag ID or multiple tag IDs. When multiple are specified, Discover sessions matching any of the tag IDs are included.',
    arrayDescription: 'Tag IDs to include.',
  },
  excluded_tags: {
    description:
      'A tag ID to exclude. Accepts a single tag ID or multiple tag IDs. When multiple are specified, Discover sessions matching any of the tag IDs are excluded.',
    arrayDescription: 'Tag IDs to exclude.',
  },
}).extend({
  tag_names: z
    .union([z.string(), z.array(z.string()).max(100)])
    .optional()
    .meta({
      description:
        'A tag name to include. Accepts a single tag name or multiple tag names. When multiple are specified, Discover sessions matching any of the tag names are included. If the same name is shared by multiple tags, sessions matching any of those tags are included.',
    }),
  excluded_tag_names: z
    .union([z.string(), z.array(z.string()).max(100)])
    .optional()
    .meta({
      description:
        'A tag name to exclude. Accepts a single tag name or multiple tag names. When multiple are specified, Discover sessions matching any of the tag names are excluded. If the same name is shared by multiple tags, sessions matching any of those tags are excluded.',
    }),
  query: z
    .string()
    .max(MAX_SEARCH_QUERY_LENGTH)
    .meta({
      description:
        'Full-text search (`simple_query_string`) over `title` and `description`. All terms must match.',
    })
    .optional(),
});

const discoverSessionSearchItemSchema = z
  .object({
    id: z.string().meta({ description: 'The Discover session ID.' }),
    data: z
      .object({
        title: z.string().meta({ description: 'Discover session title.' }),
        description: z.string().optional().meta({ description: 'Discover session description.' }),
        tags: getAsCodeTagsSchema(
          'Tag IDs associated with this Discover session.',
          MAX_DISCOVER_SESSION_TAGS
        ).optional(),
      })
      .strict(),
    meta: asCodeMetaSchema,
  })
  .strict();

export const discoverSessionSearchResponseSchema = z
  .object({
    data: z
      .array(discoverSessionSearchItemSchema)
      // Mirror the request's production-enforced `per_page` maximum in OAS and dev response validation.
      .max(PAGINATION_MAX_SIZE)
      .meta({
        description: 'List of matching Discover sessions (summaries, not the full session state).',
      }),
    meta: asCodePaginationResponseMetaSchema,
  })
  .strict();

export type DiscoverSessionApiResponse = z.output<typeof discoverSessionApiResponseSchema>;
export type DiscoverSessionGetResponse = z.output<typeof discoverSessionGetResponseSchema>;
export type DiscoverSessionSanitizeResponse = z.output<
  typeof discoverSessionSanitizeResponseSchema
>;
export type DiscoverSessionWarning = z.output<typeof discoverSessionWarningsSchema>[number];
export type DiscoverSessionSearchRequestParams = z.output<
  typeof discoverSessionSearchRequestParamsSchema
>;
export type DiscoverSessionSearchResponse = z.output<typeof discoverSessionSearchResponseSchema>;
export type DiscoverSessionApiControlPanels = z.output<
  typeof discoverSessionApiControlPanelsSchema
>;
