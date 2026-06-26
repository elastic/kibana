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
// All schemas use lazySchema(). All z.string() fields have .max(N).
// =============================================================================

export const SearchInputSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .min(1)
      .max(2000)
      .describe(
        'Keyword or phrase to search for across file names and content. ' +
          'Example: "Q3 budget report" or "product roadmap".'
      ),
    top: z
      .number()
      .int()
      .min(1)
      .max(200)
      .optional()
      .default(25)
      .describe('Maximum number of results to return (1–200, default 25).'),
  })
);
export type SearchInput = z.infer<typeof SearchInputSchema>;

export const GetItemChildrenInputSchema = lazySchema(() =>
  z.object({
    itemId: z
      .string()
      .max(1024)
      .optional()
      .describe(
        'ID of the folder whose children to list. Omit or pass an empty string to list the ' +
          'root of the drive. Use item IDs from search or a previous getItemChildren call.'
      ),
    top: z
      .number()
      .int()
      .min(1)
      .max(200)
      .optional()
      .default(50)
      .describe('Maximum number of items to return (1–200, default 50).'),
  })
);
export type GetItemChildrenInput = z.infer<typeof GetItemChildrenInputSchema>;

const driveIdField = z
  .string()
  .max(1024)
  .optional()
  .describe(
    'Drive ID that owns the item. Required for items from listSharedWithMe or listRecentFiles ' +
      'that have a remoteItem — use the remoteItem.parentReference.driveId value. ' +
      'Omit for items from your own drive (search, getItemChildren results).'
  );

export const GetFileMetadataInputSchema = lazySchema(() =>
  z.object({
    itemId: z
      .string()
      .min(1)
      .max(1024)
      .describe(
        'ID of the file or folder to retrieve metadata for. For shared or recent items with a ' +
          'remoteItem, use remoteItem.id here and remoteItem.parentReference.driveId for driveId.'
      ),
    driveId: driveIdField,
  })
);
export type GetFileMetadataInput = z.infer<typeof GetFileMetadataInputSchema>;

export const GetFileContentInputSchema = lazySchema(() =>
  z.object({
    itemId: z
      .string()
      .min(1)
      .max(1024)
      .describe(
        'ID of the file to download. For shared or recent items with a remoteItem, use ' +
          'remoteItem.id here and remoteItem.parentReference.driveId for driveId. ' +
          'WARNING: Returns raw binary data for non-text files — only use when you have a plan ' +
          'to process the data (e.g. via an Elasticsearch ingest pipeline attachment processor).'
      ),
    driveId: driveIdField,
  })
);
export type GetFileContentInput = z.infer<typeof GetFileContentInputSchema>;
