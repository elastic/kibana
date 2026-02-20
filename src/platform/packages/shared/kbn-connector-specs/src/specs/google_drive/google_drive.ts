/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';

// Google Drive API constants
const GOOGLE_DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DEFAULT_PAGE_SIZE = 250;
const MAX_PAGE_SIZE = 1000;
const DEFAULT_FOLDER_ID = 'root';
const GOOGLE_WORKSPACE_MIME_PREFIX = 'application/vnd.google-apps.';
const DEFAULT_EXPORT_MIME_TYPE = 'application/pdf';
// XLSX preserves tabular structure better than PDF for spreadsheets
const SHEETS_EXPORT_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

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
    throw new Error(`Google Drive API error (${googleError.code})`);
  }
}

export const GoogleDriveConnector: ConnectorSpec = {
  metadata: {
    id: '.google_drive',
    displayName: 'Google Drive',
    description: i18n.translate('core.kibanaConnectorSpecs.googleDrive.metadata.description', {
      defaultMessage: 'Search and access files and folders in Google Drive',
    }),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows'],
  },
  auth: {
    types: ['bearer'],
    headers: {
      Accept: 'application/json',
    },
  },

  actions: {
    searchFiles: {
      isTool: true,
      input: z.object({
        query: z
          .string()
          .min(1)
          .describe(
            'Google Drive search query. ' +
              "Examples: name contains 'budget' and trashed=false | " +
              "fullText contains 'quarterly report' and mimeType='application/pdf' | " +
              "'me' in owners and modifiedTime > '2024-01-01' | " +
              "mimeType='application/vnd.google-apps.folder' and trashed=false. " +
              "Operators: contains, =, !=, <, >, <=, >=. Combine with 'and'/'or'. " +
              "String values use single quotes. Add 'and trashed=false' to exclude trashed files."
          ),
        pageSize: z
          .number()
          .optional()
          .default(DEFAULT_PAGE_SIZE)
          .describe('Maximum number of files to return (1-1000)'),
        pageToken: z.string().optional().describe('Token for pagination'),
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
          .describe('Field and direction to order results by'),
      }),
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
      input: z.object({
        folderId: z
          .preprocess((val) => (val === '' ? undefined : val), z.string().optional())
          .default(DEFAULT_FOLDER_ID)
          .describe("Parent folder ID ('root' for root folder)"),
        pageSize: z
          .number()
          .optional()
          .default(DEFAULT_PAGE_SIZE)
          .describe('Maximum number of files to return (1-1000)'),
        pageToken: z.string().optional().describe('Token for pagination'),
        orderBy: z
          .preprocess(
            (val) => (val === '' ? undefined : val),
            z.enum(['name', 'modifiedTime', 'createdTime']).optional()
          )
          .describe('Field to order results by'),
        includeTrashed: z
          .boolean()
          .optional()
          .default(false)
          .describe('Include trashed files in results (default: false)'),
      }),
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
      input: z.object({
        fileId: z.string().min(1).describe('The ID of the file to download'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          fileId: string;
        };

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

          const fileMetadata = metadataResponse.data;
          const isGoogleDoc = fileMetadata.mimeType?.startsWith(GOOGLE_WORKSPACE_MIME_PREFIX);

          let contentResponse;
          let resolvedMimeType: string = fileMetadata.mimeType;

          if (isGoogleDoc) {
            // Export Google Workspace documents
            // Use XLSX for Sheets (preserves tabular structure), PDF for everything else
            const defaultExport =
              fileMetadata.mimeType === 'application/vnd.google-apps.spreadsheet'
                ? SHEETS_EXPORT_MIME_TYPE
                : DEFAULT_EXPORT_MIME_TYPE;
            resolvedMimeType = defaultExport;
            contentResponse = await ctx.client.get(
              `${GOOGLE_DRIVE_API_BASE}/files/${typedInput.fileId}/export`,
              {
                params: {
                  mimeType: resolvedMimeType,
                },
                responseType: 'arraybuffer',
              }
            );
          } else {
            // Download native files
            contentResponse = await ctx.client.get(
              `${GOOGLE_DRIVE_API_BASE}/files/${typedInput.fileId}`,
              {
                params: {
                  alt: 'media',
                },
                responseType: 'arraybuffer',
              }
            );
          }

          const buffer = Buffer.from(contentResponse.data);
          const base64Content = buffer.toString('base64');

          return {
            id: fileMetadata.id,
            name: fileMetadata.name,
            mimeType: resolvedMimeType,
            size: fileMetadata.size,
            content: base64Content,
            encoding: 'base64',
          };
        } catch (error: unknown) {
          throwGoogleDriveError(error);
          throw error;
        }
      },
    },

    getFileMetadata: {
      isTool: true,
      input: z.object({
        fileIds: z
          .array(z.string().min(1))
          .min(1)
          .describe(
            'Array of file IDs to fetch metadata for. Use after search/list to get ownership, ' +
              'sharing, permissions, and other details for specific files.'
          ),
      }),
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
                  params: { fields: metadataFields },
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
  },

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
