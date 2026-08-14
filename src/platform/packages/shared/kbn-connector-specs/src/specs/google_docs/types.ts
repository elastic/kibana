/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

// =============================================================================
// Action input schemas & inferred types
// =============================================================================

export const ListToolsInputSchema = lazySchema(() => z.object({}));
export type ListToolsInput = z.infer<typeof ListToolsInputSchema>;

export const ReadDocInputSchema = lazySchema(() =>
  z.object({
    document_id: z
      .string()
      .min(1)
      .max(200)
      .describe(
        'The ID of the Google Doc to read. Found in the document URL: ' +
          'docs.google.com/document/d/{document_id}/edit. Example: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"'
      ),
  })
);
export type ReadDocInput = z.infer<typeof ReadDocInputSchema>;

export const UpdateDocInputSchema = lazySchema(() =>
  z.object({
    document_id: z
      .string()
      .min(1)
      .max(200)
      .describe(
        'The ID of the Google Doc to update. Found in the document URL: ' +
          'docs.google.com/document/d/{document_id}/edit. Example: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"'
      ),
    requests: z
      .array(z.record(z.string().max(200), z.unknown()))
      .min(1)
      .max(100)
      .describe(
        'Array of batch update request objects for the Google Docs batchUpdate API. Each object must contain exactly ' +
          'one key identifying the operation type, plus its parameters. ' +
          'Examples: ' +
          '{"insertText": {"location": {"index": 1}, "text": "Hello"}} — insert text at a specific position; ' +
          '{"replaceAllText": {"containsText": {"text": "old"}, "replaceText": "new"}} — find and replace text; ' +
          '{"updateTextStyle": {"range": {"startIndex": 1, "endIndex": 10}, "textStyle": {"bold": true}, ' +
          '"fields": "bold"}} — apply bold formatting. ' +
          'Supported operations include insertText, replaceAllText, updateTextStyle, updateParagraphStyle, ' +
          'createParagraphBullets, deleteParagraphBullets, insertTable, insertTableRow, deleteTableRow, ' +
          'insertInlineImage, deleteContentRange, and 30+ more. ' +
          'See the Google Docs batchUpdate reference for the full list.'
      ),
  })
);
export type UpdateDocInput = z.infer<typeof UpdateDocInputSchema>;

export const CallToolInputSchema = lazySchema(() =>
  z.object({
    name: z
      .string()
      .min(1)
      .max(200)
      .describe('The MCP tool name to call. Use listTools to discover available tools.'),
    arguments: z
      .record(z.string().max(200), z.unknown())
      .refine((obj) => Object.keys(obj).length <= 50, { message: 'Too many arguments (max 50)' })
      .optional()
      .describe('Tool arguments as a key/value map (max 50 entries)'),
  })
);
export type CallToolInput = z.infer<typeof CallToolInputSchema>;
