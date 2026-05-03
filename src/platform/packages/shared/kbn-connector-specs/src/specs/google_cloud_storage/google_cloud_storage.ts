/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { ConnectorSpec } from '../../connector_spec';
import {
  ListProjectsInputSchema,
  ListBucketsInputSchema,
  ListObjectsInputSchema,
  GetObjectMetadataInputSchema,
  DownloadObjectInputSchema,
} from './types';
import type {
  ListProjectsInput,
  ListBucketsInput,
  ListObjectsInput,
  GetObjectMetadataInput,
  DownloadObjectInput,
} from './types';

const GCS_API_BASE = 'https://storage.googleapis.com/storage/v1';
const RESOURCE_MANAGER_API_BASE = 'https://cloudresourcemanager.googleapis.com/v1';
const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 1000;

/**
 * Extracts and throws a meaningful error from GCS API responses.
 */
function throwGcsError(error: unknown): void {
  const axiosError = error as {
    response?: { data?: { error?: { message?: string; code?: number } } };
  };
  const gcsError = axiosError.response?.data?.error;
  if (gcsError) {
    throw new Error(`Google Cloud Storage API error (${gcsError.code})`);
  }
}

export const GoogleCloudStorageConnector: ConnectorSpec = {
  metadata: {
    id: '.google_cloud_storage',
    displayName: 'Google Cloud Storage',
    description: i18n.translate(
      'core.kibanaConnectorSpecs.googleCloudStorage.metadata.description',
      {
        defaultMessage: 'Search and access files in Google Cloud Storage buckets',
      }
    ),
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
            'https://www.googleapis.com/auth/devstorage.read_only https://www.googleapis.com/auth/cloudplatformprojects.readonly',
        },
      },
    ],
    headers: {
      Accept: 'application/json',
    },
  },

  actions: {
    listProjects: {
      isTool: true,
      description:
        'List Google Cloud projects accessible to the configured credentials. This is the starting point for exploring Google Cloud Storage — use the returned project IDs with listBuckets.',
      input: ListProjectsInputSchema,
      handler: async (ctx, input: ListProjectsInput) => {
        const params: Record<string, string | number> = {
          pageSize: Math.min(input.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
        };
        if (input.pageToken) params.pageToken = input.pageToken;
        if (input.filter) params.filter = input.filter;

        try {
          const response = await ctx.client.get(`${RESOURCE_MANAGER_API_BASE}/projects`, {
            params,
          });
          return response.data;
        } catch (error: unknown) {
          throwGcsError(error);
          throw error;
        }
      },
    },

    listBuckets: {
      isTool: true,
      description:
        'List all Google Cloud Storage buckets in a project. Use listProjects first to discover available project IDs.',
      input: ListBucketsInputSchema,
      handler: async (ctx, input: ListBucketsInput) => {
        const params: Record<string, string | number> = {
          project: input.project,
          maxResults: Math.min(input.maxResults ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
        };
        if (input.pageToken) params.pageToken = input.pageToken;
        if (input.prefix) params.prefix = input.prefix;

        try {
          const response = await ctx.client.get(`${GCS_API_BASE}/b`, { params });
          return response.data;
        } catch (error: unknown) {
          throwGcsError(error);
          throw error;
        }
      },
    },

    listObjects: {
      isTool: true,
      description:
        "List objects in a Google Cloud Storage bucket. This is the only way to find files — there is no search tool. Use prefix to filter by path and delimiter='/' to browse folder-by-folder, or omit delimiter to list all objects recursively under a prefix.",
      input: ListObjectsInputSchema,
      handler: async (ctx, input: ListObjectsInput) => {
        const params: Record<string, string | number> = {
          maxResults: Math.min(input.maxResults ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
        };
        if (input.prefix) params.prefix = input.prefix;
        if (input.delimiter) params.delimiter = input.delimiter;
        if (input.pageToken) params.pageToken = input.pageToken;

        try {
          const response = await ctx.client.get(
            `${GCS_API_BASE}/b/${encodeURIComponent(input.bucket)}/o`,
            { params }
          );
          return response.data;
        } catch (error: unknown) {
          throwGcsError(error);
          throw error;
        }
      },
    },

    getObjectMetadata: {
      isTool: true,
      description:
        'Get detailed metadata for a specific GCS object including content type, size, storage class, checksums, timestamps, and user-defined metadata. Use after listObjects to inspect a specific file. Prefer this over downloadObject when you only need file properties, not content.',
      input: GetObjectMetadataInputSchema,
      handler: async (ctx, input: GetObjectMetadataInput) => {
        try {
          const response = await ctx.client.get(
            `${GCS_API_BASE}/b/${encodeURIComponent(input.bucket)}/o/${encodeURIComponent(
              input.object
            )}`
          );
          return response.data;
        } catch (error: unknown) {
          throwGcsError(error);
          throw error;
        }
      },
    },

    downloadObject: {
      isTool: true,
      description:
        'Download an object from Google Cloud Storage and return its raw content as base64. Works with PDFs, Office documents, text files, and other formats. Use getObjectMetadata instead if you only need file properties (size, type, dates). Files exceeding maximumDownloadSizeBytes are skipped and returned with metadata only (hasContent: false).',
      input: DownloadObjectInputSchema,
      handler: async (ctx, input: DownloadObjectInput) => {
        try {
          const metaResponse = await ctx.client.get(
            `${GCS_API_BASE}/b/${encodeURIComponent(input.bucket)}/o/${encodeURIComponent(
              input.object
            )}`
          );
          const meta = metaResponse.data;
          const fileSize = parseInt(meta.size, 10);

          if (fileSize > input.maximumDownloadSizeBytes) {
            return {
              name: meta.name,
              bucket: meta.bucket,
              contentType: meta.contentType,
              size: meta.size,
              timeCreated: meta.timeCreated,
              updated: meta.updated,
              hasContent: false,
              message: `File size (${fileSize} bytes) exceeds maximum download size (${input.maximumDownloadSizeBytes} bytes). Use get_object_metadata to inspect this file without downloading.`,
            };
          }

          const contentResponse = await ctx.client.get(
            `${GCS_API_BASE}/b/${encodeURIComponent(input.bucket)}/o/${encodeURIComponent(
              input.object
            )}`,
            {
              params: { alt: 'media' },
              responseType: 'arraybuffer',
            }
          );

          const buffer = Buffer.from(contentResponse.data);

          return {
            name: meta.name,
            bucket: meta.bucket,
            contentType: meta.contentType,
            size: meta.size,
            timeCreated: meta.timeCreated,
            updated: meta.updated,
            hasContent: true,
            content: buffer.toString('base64'),
            encoding: 'base64',
          };
        } catch (error: unknown) {
          throwGcsError(error);
          throw error;
        }
      },
    },
  },

  skill: [
    'Navigate Google Cloud Storage in this order: listProjects → listBuckets (pass projectId) → listObjects (pass bucket) → downloadObject or getObjectMetadata.',
    'There is no search tool. To find files, call listObjects with a prefix parameter to filter by path prefix.',
  ].join('\n'),

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.googleCloudStorage.test.description', {
      defaultMessage: 'Verifies Google Cloud Storage connection by calling the GCS API',
    }),
    handler: async (ctx) => {
      try {
        // Use the service discovery endpoint — it's accessible with any valid GCS token
        // and doesn't require a project ID
        const response = await ctx.client.get('https://storage.googleapis.com/storage/v1/b', {
          params: { project: 'test', maxResults: 1 },
        });
        // A 200 or 400 (missing project) both prove the token is valid
        if (response.status === 200 || response.status === 400) {
          return { ok: true, message: 'Successfully connected to Google Cloud Storage API' };
        }
        return { ok: false, message: 'Failed to connect to Google Cloud Storage API' };
      } catch (error) {
        // A 400 error from GCS (e.g. "required" project param) still proves the token works
        const axiosError = error as {
          response?: { status?: number; data?: { error?: { code?: number } } };
        };
        const status = axiosError.response?.status ?? axiosError.response?.data?.error?.code;
        if (status === 400) {
          return { ok: true, message: 'Successfully connected to Google Cloud Storage API' };
        }
        return {
          ok: false,
          message: `Failed to connect to Google Cloud Storage API: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        };
      }
    },
  },
};
