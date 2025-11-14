/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { z } from '@kbn/zod';

// Notion connector parameter schemas for different sub-actions
export const NotionSearchActionParamsSchema = z.object({
  query: z.string(),
  queryObjectType: z.enum(['page', 'data_source']),
  startCursor: z.string().optional(),
  pageSize: z.number().optional(),
});
export const NotionGetPageActionParamsSchema = z.object({ pageId: z.string() });
export const NotionGetDataSourceActionParamsSchema = z.object({ dataSourceId: z.string() });
const NotionFilterSchema = z
  .object({
    property: z.string(),
  })
  .catchall(z.any());

export const NotionQueryDataSourceActionParamsSchema = z.object({
  dataSourceId: z.string(),
  filter: NotionFilterSchema.optional(),
  startCursor: z.string().optional(),
  pageSize: z.number().optional(),
});
// Notion connector response schema
// export const NotionGetDataSourceActionResponseSchema = z.object({
//   object: z.string(),
//   id: z.string(),
//   created_at: z.string(),
//   last_edited_at: z.string(),
//   properties: z.object({}),
//   parent: z.object({
//     type: z.string(),
//     database_id: z.string(),
//   }),
//   database_parent: z.object({
//     type: z.string(),
//     page_id: z.string(),
//   }),
//   archived: z.boolean(),
//   is_inline: z.boolean(),
//   icon: z.object({
//     type: z.string(),
//     emoji: z.string(),
//   }),
//   cover: z.object({
//     type: z.string(),
//     external: z.object({
//       url: z.string(),
//     }),
//   }),
//   url: z.string(),
//   title: z.array(
//     z.object({
//       type: z.string(),
//       text: z.object({
//         content: z.string(),
//         link: z.string(),
//       }),
//       annotations: z.object({
//         bold: z.boolean(),
//         italic: z.boolean(),
//         strikethrough: z.boolean(),
//         underline: z.boolean(),
//         code: z.boolean(),
//         color: z.string(),
//       }),
//       plain_text: z.string(),
//       href: z.string(),
//     })
//   ),
// });
