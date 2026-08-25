/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod';
import { asCodePaginationParamsSchema } from '../pagination';
import { getAsCodeTagsSchema } from '../tags/schema';

export const asCodeSearchRequestSchema = lazySchema(() =>
  z
    .object({
      ...asCodePaginationParamsSchema.shape,
      query: z.string().optional().meta({
        description:
          'Filters results by `title` and `description` using Elasticsearch [`simple_query_string`](https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-simple-query-string-query) syntax. Multi-word terms require all words to match.',
      }),
      tags: z
        .union([z.string(), getAsCodeTagsSchema('Tag IDs associated with this dashboard.', 100)])
        .optional()
        .meta({
          description:
            'A tag ID to include. Accepts a single tag ID or multiple tag IDs. When multiple are specified, library items matching any of the tag IDs are included.',
        }),
      excluded_tags: z
        .union([z.string(), getAsCodeTagsSchema('Tag IDs associated with this dashboard.', 100)])
        .optional()
        .meta({
          description:
            'A tag ID to exclude. Accepts a single tag ID or multiple tag IDs. When multiple are specified, library items matching any of the tag IDs are excluded.',
        }),
      tag_names: z
        .union([z.string(), z.array(z.string()).max(100)])
        .optional()
        .meta({
          openapi: { availability: { stability: 'stable', since: '9.6.0' } },
          description:
            'A tag name to include. Accepts a single tag name or multiple tag names. When multiple are specified, library items matching any of the tag names are included. If the same name is shared by multiple tags, items matching any of those tags are included.',
        }),
      excluded_tag_names: z
        .union([z.string(), z.array(z.string()).max(100)])
        .optional()
        .meta({
          openapi: { availability: { stability: 'stable', since: '9.6.0' } },
          description:
            'A tag name to exclude. Accepts a single tag name or multiple tag names. When multiple are specified, library items matching any of the tag names are excluded. If the same name is shared by multiple tags, items matching any of those tags are excluded.',
        }),
    })
    .strict()
);
