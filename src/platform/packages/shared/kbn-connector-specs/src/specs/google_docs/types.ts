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
    max_characters: z
      .number()
      .int()
      .min(1_000)
      .max(200_000)
      .default(100_000)
      .describe(
        'Maximum number of characters to return (default 100,000, range 1,000–200,000). ' +
          'If the document is longer, the response includes truncated: true and next_offset ' +
          'for fetching the next page.'
      ),
    offset: z
      .number()
      .int()
      .min(0)
      // Must be at least offset_max + max_characters (10M + 200k) so that a caller
      // passing back next_offset from the previous response never hits a Zod validation
      // error when reading the final page of a very large document.
      .max(10_200_000)
      .default(0)
      .describe(
        'Character offset to start reading from (default 0). ' +
          'Pass the next_offset value from a previous response to read the next page.'
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
      .array(
        z.record(z.string().max(200), z.unknown()).refine((obj) => Object.keys(obj).length === 1, {
          message: 'Each request object must contain exactly one operation key',
        })
      )
      .min(1)
      .max(100)
      .refine((arr) => new TextEncoder().encode(JSON.stringify(arr)).byteLength <= 102_400, {
        message: 'Total size of requests must not exceed 100 KB',
      })
      .describe(
        'Array of batch update request objects for the Google Docs batchUpdate API. Each object must contain exactly ' +
          'one key identifying the operation type, plus its parameters. ' +
          'Examples: ' +
          '{"replaceAllText": {"containsText": {"text": "old"}, "replaceText": "new"}} — find and replace; ' +
          '{"updateTextStyle": {"range": {"startIndex": 1, "endIndex": 10}, "textStyle": {"bold": true}, ' +
          '"fields": "bold"}} — apply formatting. ' +
          'Supported operations include replaceAllText, updateTextStyle, updateParagraphStyle, ' +
          'createParagraphBullets, deleteParagraphBullets, insertTable, insertTableRow, deleteTableRow, ' +
          'insertInlineImage, createNamedRange, deleteNamedRange, and more. ' +
          'See the Google Docs batchUpdate reference for the full list.'
      ),
  })
);
export type UpdateDocInput = z.infer<typeof UpdateDocInputSchema>;
