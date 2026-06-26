/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import {
  setConnectorActionErrorMeta,
  getConnectorActionErrorMeta,
  getFinitePositiveNumber,
  getEstimatedBase64OutputBytes,
} from '../../connector_utils';
import type { ConnectorSpec } from '../../connector_spec';
import { parseCommaSeparatedIds, parseDriveUrlsFromText } from './google_drive_helpers';
// Google Drive API constants
const GOOGLE_DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DEFAULT_PAGE_SIZE = 250;
const MAX_PAGE_SIZE = 1000;
const DEFAULT_FOLDER_ID = 'root';
const GOOGLE_WORKSPACE_MIME_PREFIX = 'application/vnd.google-apps.';
const DEFAULT_EXPORT_MIME_TYPE = 'application/pdf';
// XLSX preserves tabular structure better than PDF for spreadsheets
const SHEETS_EXPORT_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
interface GoogleDriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
}

/**
 * Escapes special characters in a string for use in Google Drive query syntax.
 * Google Drive queries use single quotes for string values, so backslashes
 * and single quotes must be escaped to avoid syntax errors and injection.
 */
function escapeQueryValue(value: string): string {
  // Escape backslashes first, then single quotes
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Extracts and throws a meaningful error from Google Drive API responses.
 * Returns void if the error doesn't have Google API error details.
 */
function throwGoogleDriveError(error: unknown): void {
  const axiosError = error as {
    response?: { data?: { error?: { message?: string; code?: number } } };
  };
  const googleError = axiosError.response?.data?.error;
  if (googleError) {
    const newError = new Error(`Google Drive API error (${googleError.code})`);
    const meta = getConnectorActionErrorMeta(error);
    if (meta) {
      setConnectorActionErrorMeta(newError, meta);
    }
    throw newError;
  }
}

// Text export MIME types for Google Workspace documents
const TEXT_EXPORT_DOCS = 'text/markdown';
const TEXT_EXPORT_SHEETS = 'text/csv';
const TEXT_EXPORT_DEFAULT = 'text/plain';
const DRIVE_FILE_LIST_FIELDS =
  'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, parents, owners(emailAddress,displayName))';

function buildSharedDriveListParams(input: {
  q: string;
  pageSize: number;
  pageToken?: string;
  orderBy?: string;
}): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {
    q: input.q,
    pageSize: Math.min(input.pageSize || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
    fields: DRIVE_FILE_LIST_FIELDS,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  };

  if (input.pageToken) {
    params.pageToken = input.pageToken;
  }

  if (input.orderBy) {
    params.orderBy = input.orderBy;
  }

  return params;
}

function resolveExportMimeType(
  sourceMimeType: string,
  responseType: 'arraybuffer' | 'text'
): string {
  if (responseType === 'text') {
    switch (sourceMimeType) {
      case 'application/vnd.google-apps.spreadsheet':
        return TEXT_EXPORT_SHEETS;
      case 'application/vnd.google-apps.document':
        return TEXT_EXPORT_DOCS;
      default:
        return TEXT_EXPORT_DEFAULT;
    }
  }
  return sourceMimeType === 'application/vnd.google-apps.spreadsheet'
    ? SHEETS_EXPORT_MIME_TYPE
    : DEFAULT_EXPORT_MIME_TYPE;
}

export const GoogleDriveConnector: ConnectorSpec = {
  metadata: {
    id: '.google_drive',
    displayName: 'Google Drive',
    description: i18n.translate('core.kibanaConnectorSpecs.googleDrive.metadata.description', {
      defaultMessage: 'Search and access files and folders in Google Drive',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [
      'bearer',
      {
        type: 'oauth_authorization_code',
        overrides: {
          meta: {
            authorizationUrl: { hidden: true },
            tokenUrl: { hidden: true },
            scope: { hidden: true },
          },
        },
        defaults: {
          authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
          tokenUrl: 'https://oauth2.googleapis.com/token',
          scope:
            'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.metadata.readonly',
        },
      },
      {
        type: 'ears',
        isExperimental: true,
        overrides: {
          meta: { scope: { disabled: true } },
        },
        defaults: {
          provider: 'google',
          scope:
            'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.metadata.readonly',
        },
      },
    ],
    headers: {
      Accept: 'application/json',
    },
  },

  actions: {
    searchFiles: {
      isTool: true,
      description:
        "Search for files in Google Drive using Google's query syntax. Use this to find files by name, content, type, owner, or modification date across the entire Drive.",
      input: lazySchema(() =>
        z.object({
          query: z
            .string()
            .min(1)
            .describe(
              'Google Drive search query passed verbatim to the Drive API `q` parameter. ' +
                'Key patterns: ' +
                "name match: name contains 'budget' | " +
                "full-text search: fullText contains 'quarterly report' | " +
                "MIME type filter: mimeType = 'application/pdf' | " +
                "owner filter: 'me' in owners | " +
                "date filter: modifiedTime > '2024-01-01' | " +
                "folder contents: '<folderId>' in parents | " +
                'exclude trash: trashed = false (always add unless the user asks for trashed files). ' +
                "Operators: contains, =, !=, <, >, <=, >=. Combine clauses with 'and' / 'or'. " +
                'String values must use single quotes. ' +
                "Example: name contains 'budget' and mimeType = 'application/pdf' and trashed = false"
            ),
          pageSize: z
            .number()
            .max(1000)
            .default(DEFAULT_PAGE_SIZE)
            .describe('Number of results to return (default 250, max 1000)'),
          pageToken: z
            .string()
            .optional()
            .describe(
              "Pagination token. Pass the 'nextPageToken' value from a previous response to get the next page. When nextPageToken is absent in the response, there are no more results."
            ),
          orderBy: z
            .preprocess(
              (val) => (val === '' ? undefined : val),
              z
                .enum([
                  'createdTime',
                  'createdTime desc',
                  'modifiedTime',
                  'modifiedTime desc',
                  'name',
                  'name desc',
                ])
                .optional()
            )
            .describe(
              "Sort order for results. Options: 'createdTime', 'createdTime desc', 'modifiedTime', 'modifiedTime desc', 'name', or 'name desc'"
            ),
        })
      ),
      handler: async (ctx, input) => {
        const typedInput = input as {
          query: string;
          pageSize: number;
          pageToken?: string;
          orderBy?: string;
        };

        const params: Record<string, string | number> = {
          q: typedInput.query,
          pageSize: Math.min(typedInput.pageSize || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
          fields:
            'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink)',
        };

        if (typedInput.pageToken) {
          params.pageToken = typedInput.pageToken;
        }

        if (typedInput.orderBy) {
          params.orderBy = typedInput.orderBy;
        }

        try {
          const response = await ctx.client.get(`${GOOGLE_DRIVE_API_BASE}/files`, {
            params,
          });

          return {
            files: response.data.files || [],
            nextPageToken: response.data.nextPageToken,
          };
        } catch (error: unknown) {
          throwGoogleDriveError(error);
          throw error;
        }
      },
    },

    listFiles: {
      isTool: true,
      description:
        'List files and subfolders within a specific Google Drive folder. Use this to browse folder contents by folder ID, or start at the root folder.',
      input: lazySchema(() =>
        z.object({
          folderId: z
            .preprocess((val) => (val === '' ? undefined : val), z.string().optional())
            .default(DEFAULT_FOLDER_ID)
            .describe(
              "Folder ID to list contents of. Use 'root' for the root folder, or a folder ID from search/list results. Defaults to 'root'."
            ),
          pageSize: z
            .number()
            .max(1000)
            .default(DEFAULT_PAGE_SIZE)
            .describe('Number of results to return (default 250, max 1000)'),
          pageToken: z
            .string()
            .optional()
            .describe(
              "Pagination token. Pass the 'nextPageToken' value from a previous response to get the next page. When nextPageToken is absent in the response, there are no more results."
            ),
          orderBy: z
            .preprocess(
              (val) => (val === '' ? undefined : val),
              z.enum(['name', 'modifiedTime', 'createdTime']).optional()
            )
            .describe("Sort order for results. Options: 'name', 'modifiedTime', or 'createdTime'"),
          includeTrashed: z
            .boolean()
            .optional()
            .default(false)
            .describe('Whether to include trashed files in results (default: false)'),
        })
      ),
      handler: async (ctx, input) => {
        const typedInput = input as {
          folderId: string;
          pageSize: number;
          pageToken?: string;
          orderBy?: string;
          includeTrashed: boolean;
        };

        const folderId = typedInput.folderId || DEFAULT_FOLDER_ID;
        const trashedFilter = typedInput.includeTrashed ? '' : ' and trashed=false';
        const params: Record<string, string | number> = {
          q: `'${escapeQueryValue(folderId)}' in parents${trashedFilter}`,
          pageSize: Math.min(typedInput.pageSize || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
          fields:
            'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink)',
        };

        if (typedInput.pageToken) {
          params.pageToken = typedInput.pageToken;
        }

        if (typedInput.orderBy) {
          params.orderBy = typedInput.orderBy;
        }

        try {
          const response = await ctx.client.get(`${GOOGLE_DRIVE_API_BASE}/files`, {
            params,
          });

          return {
            files: response.data.files || [],
            nextPageToken: response.data.nextPageToken,
          };
        } catch (error: unknown) {
          throwGoogleDriveError(error);
          throw error;
        }
      },
    },

    downloadFile: {
      isTool: true,
      description:
        'Download a file from Google Drive and return its content. ' +
        'With the default responseType "arraybuffer", content is returned base64-encoded — suitable for PDFs, images, Office documents, and any binary format. ' +
        'With responseType "text", content is returned as a plain string — suitable for CSV, Markdown, plain text, HTML, and other text formats; ' +
        'Google Docs export as Markdown and Sheets export as CSV automatically. ' +
        'WARNING: Binary (arraybuffer) responses can be very large. Only use them when you have a plan to process the data (e.g. via an Elasticsearch ingest pipeline attachment processor). ' +
        'Use file IDs from searchFiles or listFiles results.',
      input: lazySchema(() =>
        z.object({
          fileId: z
            .string()
            .min(1)
            .describe(
              'The ID of the file to download. Use IDs from searchFiles or listFiles results.'
            ),
          responseType: z
            .enum(['arraybuffer', 'text'])
            .default('arraybuffer')
            .describe(
              'Controls the response format. ' +
                '"arraybuffer" (default): content is returned as base64-encoded binary, suitable for any file type including PDFs, images, and Office documents. ' +
                '"text": content is returned as a plain UTF-8 string without base64 encoding, suitable for CSV, Markdown, plain text, and HTML files. ' +
                'When "text" is used with Google Workspace documents, the export format changes automatically: ' +
                'Google Docs → text/markdown, Google Sheets → text/csv, Google Slides and others → text/plain.'
            ),
        })
      ),
      handler: async (ctx, input) => {
        const typedInput = input as {
          fileId: string;
          responseType: 'arraybuffer' | 'text';
        };
        let fileMetadataForError: GoogleDriveFileMetadata | undefined;

        try {
          // First, get file metadata to determine if it's a Google Workspace document
          const metadataResponse = await ctx.client.get(
            `${GOOGLE_DRIVE_API_BASE}/files/${typedInput.fileId}`,
            {
              params: {
                fields: 'id, name, mimeType, size',
              },
            }
          );

          const fileMetadata = metadataResponse.data as GoogleDriveFileMetadata;
          fileMetadataForError = fileMetadata;
          const isGoogleDoc = fileMetadata.mimeType?.startsWith(GOOGLE_WORKSPACE_MIME_PREFIX);

          let useTextResponse = typedInput.responseType === 'text';
          let contentResponse;
          let resolvedMimeType: string = fileMetadata.mimeType;

          if (isGoogleDoc) {
            resolvedMimeType = resolveExportMimeType(
              fileMetadata.mimeType,
              typedInput.responseType
            );
            contentResponse = await ctx.client.get(
              `${GOOGLE_DRIVE_API_BASE}/files/${typedInput.fileId}/export`,
              {
                params: {
                  mimeType: resolvedMimeType,
                },
                responseType: useTextResponse ? 'text' : 'arraybuffer',
              }
            );
          } else {
            // For native files, only use text response if the mime type is text/*;
            // fall back to base64 for binary types even when text was requested.
            useTextResponse &&= !!fileMetadata.mimeType?.startsWith('text/');
            contentResponse = await ctx.client.get(
              `${GOOGLE_DRIVE_API_BASE}/files/${typedInput.fileId}`,
              {
                params: {
                  alt: 'media',
                },
                responseType: useTextResponse ? 'text' : 'arraybuffer',
              }
            );
          }

          let content: string;
          let encoding: string;
          if (useTextResponse) {
            content = contentResponse.data as string;
            encoding = 'utf-8';
          } else {
            content = Buffer.from(contentResponse.data).toString('base64');
            encoding = 'base64';
          }

          return {
            id: fileMetadata.id,
            name: fileMetadata.name,
            mimeType: resolvedMimeType,
            size: fileMetadata.size,
            content,
            encoding,
          };
        } catch (error: unknown) {
          const rawFileSizeBytes = getFinitePositiveNumber(fileMetadataForError?.size);
          if (rawFileSizeBytes !== undefined) {
            setConnectorActionErrorMeta(error, {
              contentLengthBytes: rawFileSizeBytes,
              estimatedOutputBytes: getEstimatedBase64OutputBytes(rawFileSizeBytes),
            });
          }

          throwGoogleDriveError(error);
          throw error;
        }
      },
    },

    getFileMetadata: {
      isTool: true,
      description:
        'Get detailed metadata for one or more specific files, including ownership, sharing status, permissions, labels, and descriptions. Use after searchFiles or listFiles to inspect specific files in depth.',
      input: lazySchema(() =>
        z.object({
          fileIds: z
            .array(z.string().min(1))
            .min(1)
            .describe(
              'Array of file IDs to fetch metadata for. Use IDs from searchFiles or listFiles results. Returns ownership, sharing, permissions, and other details for each file.'
            ),
        })
      ),
      handler: async (ctx, input) => {
        const typedInput = input as {
          fileIds: string[];
        };

        const metadataFields = [
          'id',
          'name',
          'mimeType',
          'size',
          'createdTime',
          'modifiedTime',
          'owners',
          'lastModifyingUser',
          'sharingUser',
          'shared',
          'starred',
          'trashed',
          'permissions',
          'description',
          'parents',
          'labelInfo',
          'webViewLink',
        ].join(',');

        try {
          const results = await Promise.all(
            typedInput.fileIds.map(async (fileId) => {
              try {
                const response = await ctx.client.get(`${GOOGLE_DRIVE_API_BASE}/files/${fileId}`, {
                  params: {
                    fields: metadataFields,
                    supportsAllDrives: true,
                  },
                });
                return response.data;
              } catch (error: unknown) {
                throwGoogleDriveError(error);
                throw error;
              }
            })
          );

          return { files: results };
        } catch (error: unknown) {
          throwGoogleDriveError(error);
          throw error;
        }
      },
    },

    listFilesIngest: {
      isTool: false,
      description:
        'Paginated shared-drive folder listing for ingest workflows. Lists file metadata in a team folder with modifiedTime watermark support.',
      input: lazySchema(() =>
        z.object({
          folderId: z
            .string()
            .min(1)
            .describe('Shared team folder ID to list. Required for ingest catalog workflows.'),
          modifiedAfter: z
            .string()
            .optional()
            .describe(
              "ISO-8601 modifiedTime lower bound for incremental ingest (for example 2024-01-01T00:00:00Z)."
            ),
          pageSize: z
            .number()
            .max(1000)
            .default(DEFAULT_PAGE_SIZE)
            .describe('Number of results to return (default 250, max 1000)'),
          pageToken: z
            .string()
            .optional()
            .describe('Pagination token from a previous listFilesIngest response.'),
          orderBy: z
            .preprocess(
              (val) => (val === '' ? undefined : val),
              z.enum(['modifiedTime', 'modifiedTime desc', 'name', 'name desc']).optional()
            )
            .optional()
            .describe('Sort order for results. Defaults to modifiedTime asc for watermark ingest.'),
        })
      ),
      handler: async (ctx, input) => {
        const typedInput = input as {
          folderId: string;
          modifiedAfter?: string;
          pageSize: number;
          pageToken?: string;
          orderBy?: string;
        };

        const folderClause = `'${escapeQueryValue(typedInput.folderId)}' in parents`;
        const modifiedClause =
          typedInput.modifiedAfter && typedInput.modifiedAfter.trim().length > 0
            ? ` and modifiedTime > '${escapeQueryValue(typedInput.modifiedAfter.trim())}'`
            : '';
        const q = `${folderClause} and trashed=false${modifiedClause}`;

        try {
          const response = await ctx.client.get(`${GOOGLE_DRIVE_API_BASE}/files`, {
            params: buildSharedDriveListParams({
              q,
              pageSize: typedInput.pageSize,
              pageToken: typedInput.pageToken,
              orderBy: typedInput.orderBy ?? 'modifiedTime',
            }),
          });

          const nextPageToken = response.data.nextPageToken as string | undefined;

          return {
            ok: true,
            files: response.data.files ?? [],
            nextPageToken,
            hasMore: Boolean(nextPageToken),
          };
        } catch (error: unknown) {
          throwGoogleDriveError(error);
          throw error;
        }
      },
    },

    parseDriveUrlsFromText: {
      isTool: false,
      description:
        'Extract Google Drive file IDs and URLs from free text (for example GitHub issue bodies referencing docs.google.com links).',
      input: lazySchema(() =>
        z.object({
          text: z
            .string()
            .describe('Text to scan for Google Docs/Drive URLs (issue body, title, comments).'),
        })
      ),
      handler: async (_ctx, input) => {
        const typedInput = input as { text: string };
        const links = parseDriveUrlsFromText(typedInput.text);

        return {
          ok: true,
          links,
        };
      },
    },

    parseCommaSeparatedIds: {
      isTool: false,
      description:
        'Split comma-separated manifest values (for example roadmap folder IDs) into items for foreach workflows.',
      input: lazySchema(() =>
        z.object({
          value: z
            .string()
            .describe('Comma-separated list of IDs (for example Google Drive folder IDs).'),
        })
      ),
      handler: async (_ctx, input) => {
        const typedInput = input as { value: string };

        return {
          ok: true,
          items: parseCommaSeparatedIds(typedInput.value),
        };
      },
    },
  },

  skill: [
    'Google Drive connector — usage guidance for LLMs',
    '',
    '## Search → download pattern',
    'The typical pattern for retrieving file content is: call searchFiles (or listFiles) first to',
    'discover file IDs, then call downloadFile with those IDs to fetch the actual content.',
    'Never guess or construct file IDs; always obtain them from search or list results.',
    '',
    '## Choosing the right search action',
    'Use searchFiles when the user provides a keyword, phrase, file type, owner, or date criterion',
    "— it queries across the entire Drive using Google's query syntax.",
    'Use listFiles when the user wants to browse the contents of a known folder (by folder ID),',
    'or to enumerate what is in a directory. listFiles does not support full-text search.',
    '',
    '## Choosing the right responseType for downloadFile',
    'Use responseType "text" (returns a plain UTF-8 string) when:',
    '  - The file is a native text file (.txt, .csv, .md, .html, etc.)',
    '  - You want to read a Google Doc as Markdown (exported automatically)',
    '  - You want to read a Google Sheet as CSV (exported automatically)',
    '  - You need to process the content directly as text without decoding base64',
    'Use responseType "arraybuffer" (default, returns base64) when:',
    '  - The file is binary (PDF, image, Office document, etc.)',
    '  - You plan to pass the content to an Elasticsearch ingest pipeline attachment processor',
    '  - You need the raw binary representation of any file type',
    '',
    '## Be selective with downloads',
    'downloadFile with responseType "arraybuffer" returns base64-encoded content that can be very large.',
    'When downloading multiple files, be selective — large payloads can exceed context limits.',
    'Prefer narrowing search results before downloading rather than downloading everything.',
    'For reading document content, prefer responseType "text" to avoid oversized base64 payloads.',
  ].join('\n'),

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.googleDrive.test.description', {
      defaultMessage: 'Verifies Google Drive connection by fetching user information',
    }),
    handler: async (ctx) => {
      ctx.log.debug('Google Drive test handler');
      try {
        const response = await ctx.client.get(`${GOOGLE_DRIVE_API_BASE}/about`, {
          params: {
            fields: 'user',
          },
        });

        if (response.status !== 200) {
          return { ok: false, message: 'Failed to connect to Google Drive API' };
        }

        return {
          ok: true,
          message: `Successfully connected to Google Drive API as ${
            response.data.user?.emailAddress || 'user'
          }`,
        };
      } catch (error) {
        return {
          ok: false,
          message: `Failed to connect to Google Drive API: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        };
      }
    },
  },
};
