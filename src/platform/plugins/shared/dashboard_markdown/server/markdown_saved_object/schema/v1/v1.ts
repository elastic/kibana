/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { schema } from '@kbn/config-schema';

export const markdownAttributesSchema = schema.object(
  {
    title: schema.string({
      meta: { description: 'A human-readable title' },
    }),
    description: schema.maybe(schema.string({ meta: { description: 'A short description.' } })),
    content: schema.string({
      meta: { description: 'Markdown enriched text content' },
    }),
    settings: schema.maybe(
      schema.object({
        open_links_in_new_tab: schema.boolean(),
      })
    ),
  },
  { unknowns: 'forbid' }
);

/**
 * Duplicate schema for non-SavedObject usage.
 *
 * TODO: Use in SavedObject definition once supported, see https://github.com/elastic/kibana/issues/262683
 */
export const markdownAttributesSchemaZod = z
  .object({
    title: z.string().meta({ description: 'A human-readable title' }),
    description: z.string().optional().meta({ description: 'A short description.' }),
    content: z.string().meta({ description: 'Markdown enriched text content' }),
    settings: z
      .object({
        open_links_in_new_tab: z.boolean().default(true),
      })
      .strict()
      .default({ open_links_in_new_tab: true })
      .optional(),
  })
  .strict();
