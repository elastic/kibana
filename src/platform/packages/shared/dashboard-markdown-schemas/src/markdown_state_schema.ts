/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

export const markdownStateSchema = z
  .object({
    content: z.string().meta({
      description:
        'The Markdown text rendered by the panel. Supports GitHub-flavored Markdown, including headings, paragraphs, lists, links, images, tables, blockquotes, and code blocks. Use `\\n` for line breaks within JSON strings.',
    }),
    settings: z
      .object({
        open_links_in_new_tab: z.boolean().default(true).meta({
          description: 'Open links in a new browser tab.',
        }),
      })
      .strict()
      .default({ open_links_in_new_tab: true })
      .meta({ description: 'Display settings for the markdown panel.' }),
  })
  .strict();
