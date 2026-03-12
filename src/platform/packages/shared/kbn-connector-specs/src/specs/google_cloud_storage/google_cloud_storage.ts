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
const DEFAULT_MAX_RESULTS = 100;
const MAX_MAX_RESULTS = 1000;

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
    supportedFeatureIds: ['workflows'],
  },
  auth: {
    types: ['bearer'],
    headers: {
      Accept: 'application/json',
    },
  },

  actions: {
    listProjects: {
      isTool: true,
      input: ListProjectsInputSchema,
      handler: async (ctx, input: ListProjectsInput) => {
        const params: Record<string, string | number> = {
          pageSize: Math.min(input.pageSize ?? DEFAULT_MAX_RESULTS, MAX_MAX_RESULTS),
        };
        if (input.pageToken) params.pageToken = input.pageToken;
        if (input.filter) params.filter = input.filter;

        try {
          const response = await ctx.client.get(`${RESOURCE_MANAGER_API_BASE}/projects`, {
            params,
          });
          return {
            projects: (response.data.projects ?? []).map(
              (p: {
                projectId: string;
                name: string;
                lifecycleState: string;
                createTime: string;
              }) => ({
                projectId: p.projectId,
                name: p.name,
                lifecycleState: p.lifecycleState,
                createTime: p.createTime,
              })
            ),
            nextPageToken: response.data.nextPageToken,
          };
        } catch (error: unknown) {
          throwGcsError(error);
          throw error;
        }
      },
    },

    listBuckets: {
      isTool: true,
      input: ListBucketsInputSchema,
      handler: async (ctx, input: ListBucketsInput) => {
        const params: Record<string, string | number> = {
          project: input.project,
          maxResults: Math.min(input.maxResults ?? DEFAULT_MAX_RESULTS, MAX_MAX_RESULTS),
        };
        if (input.pageToken) params.pageToken = input.pageToken;
        if (input.prefix) params.prefix = input.prefix;

        try {
          const response = await ctx.client.get(`${GCS_API_BASE}/b`, { params });
          return {
            buckets: (response.data.items ?? []).map(
              (b: {
                id: string;
                name: string;
                location: string;
                storageClass: string;
                timeCreated: string;
                updated: string;
              }) => ({
                id: b.id,
                name: b.name,
                location: b.location,
                storageClass: b.storageClass,
                timeCreated: b.timeCreated,
                updated: b.updated,
              })
            ),
            nextPageToken: response.data.nextPageToken,
          };
        } catch (error: unknown) {
          throwGcsError(error);
          throw error;
        }
      },
    },

    listObjects: {
      isTool: true,
      input: ListObjectsInputSchema,
      handler: async (ctx, input: ListObjectsInput) => {
        const params: Record<string, string | number> = {
          maxResults: Math.min(input.maxResults ?? DEFAULT_MAX_RESULTS, MAX_MAX_RESULTS),
        };
        if (input.prefix) params.prefix = input.prefix;
        if (input.delimiter) params.delimiter = input.delimiter;
        if (input.pageToken) params.pageToken = input.pageToken;

        try {
          const response = await ctx.client.get(
            `${GCS_API_BASE}/b/${encodeURIComponent(input.bucket)}/o`,
            { params }
          );
          return {
            objects: (response.data.items ?? []).map(
              (obj: {
                name: string;
                bucket: string;
                size: string;
                contentType: string;
                timeCreated: string;
                updated: string;
                md5Hash: string;
              }) => ({
                name: obj.name,
                bucket: obj.bucket,
                size: obj.size,
                contentType: obj.contentType,
                timeCreated: obj.timeCreated,
                updated: obj.updated,
                md5Hash: obj.md5Hash,
              })
            ),
            prefixes: response.data.prefixes ?? [],
            nextPageToken: response.data.nextPageToken,
          };
        } catch (error: unknown) {
          throwGcsError(error);
          throw error;
        }
      },
    },

    getObjectMetadata: {
      isTool: true,
      input: GetObjectMetadataInputSchema,
      handler: async (ctx, input: GetObjectMetadataInput) => {
        try {
          const response = await ctx.client.get(
            `${GCS_API_BASE}/b/${encodeURIComponent(input.bucket)}/o/${encodeURIComponent(
              input.object
            )}`
          );
          const obj = response.data;
          return {
            name: obj.name,
            bucket: obj.bucket,
            contentType: obj.contentType,
            size: obj.size,
            storageClass: obj.storageClass,
            timeCreated: obj.timeCreated,
            updated: obj.updated,
            md5Hash: obj.md5Hash,
            // user-defined metadata (key-value pairs set by the object owner)
            metadata: obj.metadata,
          };
        } catch (error: unknown) {
          throwGcsError(error);
          throw error;
        }
      },
    },

    downloadObject: {
      isTool: true,
      input: DownloadObjectInputSchema,
      handler: async (ctx, input: DownloadObjectInput) => {
        try {
          // First fetch metadata to get content type and name
          const metaResponse = await ctx.client.get(
            `${GCS_API_BASE}/b/${encodeURIComponent(input.bucket)}/o/${encodeURIComponent(
              input.object
            )}`
          );
          const meta = metaResponse.data;

          // Download the object content
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
