/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

export const ODataCollectionOutputSchema = z.object({
  value: z.array(z.any()).describe('Array of items returned from the API'),
});

export const GetListItemsInputSchema = z.object({
  listTitle: z
    .string()
    .describe(
      "Exact display name of the list, as returned in the Title field of getLists. Case-sensitive. Example: 'Documents', 'Tasks', 'Site Pages'"
    ),
});

export const GetFolderContentsInputSchema = z.object({
  path: z
    .string()
    .describe(
      "Server-relative URL of the folder: starts with '/', no hostname. Get this from getLists (RootFolder.ServerRelativeUrl) or from a previous getFolderContents result (ServerRelativeUrl on a folder). Example: '/sites/mysite/Shared Documents' or '/sites/mysite/Shared Documents/Reports'"
    ),
});

export const GetFolderContentsOutputSchema = z.object({
  files: z.array(z.any()).describe('Files in the folder'),
  folders: z.array(z.any()).describe('Subfolders in the folder'),
});

export const DownloadFileInputSchema = z.object({
  path: z
    .string()
    .describe(
      "Server-relative URL of the file: starts with '/', no hostname. Get this from the ServerRelativeUrl field in getFolderContents results. Example: '/sites/mysite/Shared Documents/report.txt'"
    ),
});

export const DownloadFileOutputSchema = z.object({
  contentType: z.string().optional().describe('Content-Type header'),
  contentLength: z.string().optional().describe('Content-Length header'),
  text: z.string().describe('File content as UTF-8 text'),
});

export const GetSitePageContentsInputSchema = z.object({
  pageId: z
    .number()
    .int()
    .describe(
      "Integer item ID of the page. Get this from getListItems with listTitle='Site Pages': look for the Id field (not the GUID) on the desired page. Example: 3"
    ),
});

export const SearchInputSchema = z.object({
  query: z
    .string()
    .describe(
      "KQL query string. Use plain keywords for broad search, or field:value pairs for filtered search. Examples: 'budget report', 'FileExtension:docx', 'author:Jane AND project plan', 'ContentType:Document AND title:policy'"
    ),
  from: z.number().default(0).describe('Zero-based start row for pagination (default: 0)'),
  size: z.number().default(10).describe('Number of results to return (default: 10)'),
});

export const CallRestApiInputSchema = z.object({
  method: z.enum(['GET', 'POST']).describe('HTTP method'),
  path: z
    .string()
    .describe("API path starting with '_api/' (for example, '_api/web/title')")
    .refine((value) => value.startsWith('_api/'), {
      message: "Path must start with '_api/'",
    }),
  body: z.any().optional().describe('Request body (for POST)'),
});
