/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

// SharePoint caps list titles at 255 characters and KQL query text at 4,096
// characters by default.
const SHAREPOINT_MAX_LIST_TITLE_LENGTH = 255;
const SHAREPOINT_MAX_PATH_LENGTH = 1024;
// Raw `_api/` paths can carry an OData query string ($filter, $select, ...).
const SHAREPOINT_MAX_API_PATH_LENGTH = 4096;
// Search sends KQL as a GET query parameter; ASP.NET rejects query strings over 2048 by default.
const SHAREPOINT_MAX_KQL_LENGTH = 1500;

export const ODataCollectionOutputSchema = lazySchema(() =>
  z.object({
    value: z.array(z.any()).describe('Array of items returned from the API'),
  })
);

export const GetListItemsInputSchema = lazySchema(() =>
  z.object({
    listTitle: z
      .string()
      .max(SHAREPOINT_MAX_LIST_TITLE_LENGTH)
      .describe(
        "Exact display name of the list, as returned in the Title field of getLists. Case-sensitive. Example: 'Documents', 'Tasks', 'Site Pages'"
      ),
  })
);

export const GetFolderContentsInputSchema = lazySchema(() =>
  z.object({
    path: z
      .string()
      .max(SHAREPOINT_MAX_PATH_LENGTH)
      .describe(
        "Server-relative URL of the folder: starts with '/', no hostname. Get this from getLists (RootFolder.ServerRelativeUrl) or from a previous getFolderContents result (ServerRelativeUrl on a folder). Example: '/sites/mysite/Shared Documents' or '/sites/mysite/Shared Documents/Reports'"
      ),
  })
);

export const GetFolderContentsOutputSchema = lazySchema(() =>
  z.object({
    files: z.array(z.any()).describe('Files in the folder'),
    folders: z.array(z.any()).describe('Subfolders in the folder'),
  })
);

export const DownloadFileInputSchema = lazySchema(() =>
  z.object({
    path: z
      .string()
      .max(SHAREPOINT_MAX_PATH_LENGTH)
      .describe(
        "Server-relative URL of the file: starts with '/', no hostname. Get this from the ServerRelativeUrl field in getFolderContents results. Example: '/sites/mysite/Shared Documents/report.txt'"
      ),
  })
);

export const DownloadFileOutputSchema = lazySchema(() =>
  z.object({
    contentType: z.string().optional().describe('Content-Type header'),
    contentLength: z.string().optional().describe('Content-Length header'),
    text: z.string().describe('File content as UTF-8 text'),
  })
);

export const GetSitePageContentsInputSchema = lazySchema(() =>
  z.object({
    pageId: z
      .number()
      .int()
      .describe(
        "Integer item ID of the page. Get this from getListItems with listTitle='Site Pages': look for the Id field (not the GUID) on the desired page. Example: 3"
      ),
  })
);

export const SearchInputSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .max(SHAREPOINT_MAX_KQL_LENGTH)
      .describe(
        "KQL query string. Use plain keywords for broad search, or field:value pairs for filtered search. Examples: 'budget report', 'FileExtension:docx', 'author:Jane AND project plan', 'ContentType:Document AND title:policy'"
      ),
    from: z.number().default(0).describe('Zero-based start row for pagination (default: 0)'),
    size: z.number().default(10).describe('Number of results to return (default: 10)'),
  })
);

export const CallRestApiInputSchema = lazySchema(() =>
  z.object({
    method: z.enum(['GET', 'POST']).describe('HTTP method'),
    path: z
      .string()
      .max(SHAREPOINT_MAX_API_PATH_LENGTH)
      .describe("API path starting with '_api/' (for example, '_api/web/title')")
      .refine((value) => value.startsWith('_api/'), {
        message: "Path must start with '_api/'",
      }),
    body: z.any().optional().describe('Request body (for POST)'),
  })
);
