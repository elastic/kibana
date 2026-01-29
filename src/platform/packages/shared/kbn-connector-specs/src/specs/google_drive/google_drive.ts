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
 * Escapes single quotes in a string for use in Google Drive query syntax.
 * Google Drive queries use single quotes for string values, so any single
 * quotes in the value must be escaped to avoid syntax errors.
 */
function escapeQueryValue(value: string): string {
  return value.replace(/'/g, "\\'");
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
            "Google Drive query. Use fullText contains 'term' for content search, " +
              "name contains 'term' for filename search, mimeType='application/pdf' for type filtering, " +
              "modifiedTime > '2024-01-01' for date filtering. Combine with 'and'/'or'."
          ),
        pageSize: z
          .number()
          .optional()
          .default(DEFAULT_PAGE_SIZE)
          .describe('Maximum number of files to return (1-1000)'),
        pageToken: z.string().optional().describe('Token for pagination'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          query: string;
          pageSize: number;
          pageToken?: string;
        };

        ctx.log.debug(`[google_drive.searchFiles] input: ${JSON.stringify(input)}`);

        const params: Record<string, string | number> = {
          q: typedInput.query,
          pageSize: Math.min(typedInput.pageSize || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
          fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink)',
        };

        if (typedInput.pageToken) {
          params.pageToken = typedInput.pageToken;
        }

        ctx.log.debug(`[google_drive.searchFiles] API params: ${JSON.stringify(params)}`);

        try {
          const response = await ctx.client.get(`${GOOGLE_DRIVE_API_BASE}/files`, {
            params,
          });

          return {
            files: response.data.files || [],
            nextPageToken: response.data.nextPageToken,
          };
        } catch (error: unknown) {
          // Extract detailed error from Google API response
          const axiosError = error as {
            response?: { data?: { error?: { message?: string; code?: number } } };
          };
          const googleError = axiosError.response?.data?.error;
          if (googleError) {
            throw new Error(`Google Drive API error: ${googleError.message}`);
          }
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
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          folderId: string;
          pageSize: number;
          pageToken?: string;
          orderBy?: string;
        };

        const folderId = typedInput.folderId || DEFAULT_FOLDER_ID;
        const params: Record<string, string | number> = {
          q: `'${escapeQueryValue(folderId)}' in parents and trashed=false`,
          pageSize: Math.min(typedInput.pageSize || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
          fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink)',
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
          const axiosError = error as {
            response?: { data?: { error?: { message?: string; code?: number } } };
          };
          const googleError = axiosError.response?.data?.error;
          if (googleError) {
            throw new Error(`Google Drive API error: ${googleError.message}`);
          }
          throw error;
        }
      },
    },

    downloadFile: {
      isTool: true,
      input: z.object({
        fileId: z.string().min(1).describe('The ID of the file to download'),
        mimeType: z.string().optional().describe('Export MIME type for Google Workspace documents'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          fileId: string;
          mimeType?: string;
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
          if (isGoogleDoc) {
            // Export Google Workspace documents
            // Use XLSX for Sheets (preserves tabular structure), PDF for everything else
            const defaultExport =
              fileMetadata.mimeType === 'application/vnd.google-apps.spreadsheet'
                ? SHEETS_EXPORT_MIME_TYPE
                : DEFAULT_EXPORT_MIME_TYPE;
            const exportMimeType = typedInput.mimeType || defaultExport;
            contentResponse = await ctx.client.get(
              `${GOOGLE_DRIVE_API_BASE}/files/${typedInput.fileId}/export`,
              {
                params: {
                  mimeType: exportMimeType,
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
            mimeType: isGoogleDoc
              ? typedInput.mimeType || DEFAULT_EXPORT_MIME_TYPE
              : fileMetadata.mimeType,
            size: fileMetadata.size,
            content: base64Content,
            encoding: 'base64',
          };
        } catch (error: unknown) {
          const axiosError = error as {
            response?: { data?: { error?: { message?: string; code?: number } } };
          };
          const googleError = axiosError.response?.data?.error;
          if (googleError) {
            throw new Error(`Google Drive API error: ${googleError.message}`);
          }
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
