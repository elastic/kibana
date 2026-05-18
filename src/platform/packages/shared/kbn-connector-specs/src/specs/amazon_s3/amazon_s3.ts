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
import { type ConnectorSpec } from '../../connector_spec';
import {
  downloadAmazonS3BucketObject,
  generateAmazonS3BucketObjectPresignedUrl,
  getAmazonS3BucketObjectMetadata,
  listAmazonS3BucketObjects,
  listAmazonS3Buckets,
} from './amazon_s3_api';
import type {
  ActionDownloadFileInput,
  ActionListBucketObjectsInput,
  ActionListBucketsInput,
  AmazonS3BucketObjectListing,
  AmazonS3Object,
} from './amazon_s3_types';
/**
 * Default maximum file size that can be downloaded (128 kilobytes)
 * If the user requests a file larger than this, we will return a pre-signed URL for them to download the file directly from S3 instead of through Kibana.
 */
const MAX_DOWNLOAD_FILE_SIZE_BYTES = 128 * 1024;

export const AmazonS3: ConnectorSpec = {
  metadata: {
    id: '.amazon_s3',
    displayName: 'Amazon S3',
    description: i18n.translate('core.kibanaConnectorSpecs.amazonS3.metadata.description', {
      defaultMessage: 'List buckets and download files from Amazon S3',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },
  auth: {
    types: ['aws_credentials'],
  },
  schema: lazySchema(() =>
    z.object({
      region: z
        .string()
        .min(1)
        .describe('AWS region')
        .meta({
          widget: 'text',
          label: i18n.translate('core.kibanaConnectorSpecs.amazonS3.config.region.label', {
            defaultMessage: 'AWS Region',
          }),
          helpText: i18n.translate('core.kibanaConnectorSpecs.amazonS3.config.region.helpText', {
            defaultMessage:
              'The AWS Region where your S3 buckets are located (for example, us-east-1)',
          }),
        }),
    })
  ),
  actions: {
    listBuckets: {
      isTool: true,
      description:
        'List available Amazon S3 buckets. Use this to discover which buckets exist before listing objects or downloading files.',
      input: lazySchema(() =>
        z.object({
          region: z
            .string()
            .optional()
            .describe(
              'The AWS region to list buckets from. If not specified, buckets from the default region in the authorization credentials will be listed. Example: "us-east-1".'
            ),
          prefix: z
            .string()
            .optional()
            .describe(
              'An optional prefix to filter bucket names. Only buckets whose names start with this prefix will be returned. Example: "my-app-" to find "my-app-logs" and "my-app-data".'
            ),
        })
      ),
      handler: async (ctx, input: ActionListBucketsInput) => {
        let buckets: { name?: string; creationDate?: string }[] = [];

        let continuationToken: string | undefined;
        while (true) {
          const response = await listAmazonS3Buckets(
            ctx,
            input.region,
            input.prefix,
            undefined,
            continuationToken
          );
          buckets = buckets.concat(response.buckets);

          if (!response.isTruncated || !response.nextContinuationToken) {
            break;
          }

          continuationToken = response.nextContinuationToken;
        }

        return buckets;
      },
    },

    listBucketObjects: {
      isTool: true,
      description:
        'List objects (files and folders) in an Amazon S3 bucket. Supports filtering by prefix and pagination via continuation tokens.',
      input: lazySchema(() =>
        z.object({
          bucket: z
            .string()
            .min(1)
            .describe('The name of the S3 bucket to list objects from. Example: "my-app-data".'),
          region: z
            .string()
            .optional()
            .describe(
              'The region of the S3 bucket. If not specified, will attempt to auto-detect. Example: "us-west-2".'
            ),
          prefix: z
            .string()
            .optional()
            .describe(
              'An optional prefix to filter object keys (file paths) in the bucket. Use this to list objects under a specific folder path. Example: "logs/2024/" to list only objects in that path.'
            ),
          continuationToken: z
            .string()
            .optional()
            .describe(
              'The continuation token for retrieving the next page of results. Obtain this from the "nextContinuationToken" field of a previous response when "isTruncated" is true. Omit on the first request.'
            ),
          maxKeys: z
            .number()
            .int()
            .positive()
            .optional()
            .describe(
              'Maximum number of object keys to return in a single page. Defaults to 1000. Maximum allowed is 1000.'
            )
            .default(1000),
        })
      ),
      handler: async (ctx, input: ActionListBucketObjectsInput) => {
        return (await listAmazonS3BucketObjects(
          ctx,
          input.bucket,
          input.region,
          input.prefix,
          input.maxKeys,
          input.continuationToken
        )) as AmazonS3BucketObjectListing;
      },
    },

    downloadFile: {
      isTool: true,
      description:
        'Download a file from an Amazon S3 bucket. If the file content is small enough, returns the file content directly. If the file exceeds the size limit, returns a pre-signed URL for direct download from S3 instead.',
      input: lazySchema(() =>
        z.object({
          bucket: z
            .string()
            .min(1)
            .describe(
              'The name of the S3 bucket containing the file to download. Example: "my-app-data".'
            ),
          key: z
            .string()
            .min(1)
            .describe(
              'The key (full path) of the file to download from the S3 bucket. Example: "reports/2024/summary.pdf".'
            ),
          maximumDownloadSizeBytes: z
            .number()
            .positive()
            .optional()
            .describe(
              'Maximum file size in bytes that can be downloaded for the file content. If the file size exceeds this limit, a pre-signed URL will be returned for direct download from S3 instead of the content. Default is 131072 (128 KB). Do not override this unless necessary to complete the task, as large files may exceed the token limit.'
            ),
        })
      ),
      handler: async (ctx, input: ActionDownloadFileInput) => {
        const metadata = await getAmazonS3BucketObjectMetadata(ctx, input.bucket, input.key);
        if (!metadata) {
          throw new Error('Failed to retrieve file metadata');
        }

        const contentType = metadata.contentType || 'application/octet-stream';
        const maxSize = input.maximumDownloadSizeBytes ?? MAX_DOWNLOAD_FILE_SIZE_BYTES;
        if (metadata.contentLength && metadata.contentLength > maxSize) {
          const urlString = await generateAmazonS3BucketObjectPresignedUrl(
            ctx,
            input.bucket,
            input.key,
            300
          );

          return {
            bucket: input.bucket,
            key: input.key,
            contentType,
            contentLength: metadata.contentLength,
            lastModified: metadata.lastModified,
            etag: metadata.eTag,
            hasContent: false,
            contentUrl: urlString,
            message: `File size (${metadata.contentLength} bytes) exceeds maximum downloadable size (${maxSize} bytes). Access the file using the provided link.`,
          } as AmazonS3Object;
        }

        return (await downloadAmazonS3BucketObject(ctx, input.bucket, input.key)) as AmazonS3Object;
      },
    },
  },

  skill: [
    'Use listBuckets to discover available buckets, then listBucketObjects (by bucket name) to explore their contents, then downloadFile to retrieve a specific file.',
    'There is no search capability — use listBucketObjects with a prefix to filter results by path or folder (e.g., prefix: "logs/2024/" to scope to that folder).',
    'listBucketObjects returns paginated results. When isTruncated is true in the response, pass the nextContinuationToken as continuationToken in the next request to retrieve the next page.',
    'downloadFile returns file content directly when the file is within the size limit. When the file exceeds the limit, a pre-signed URL is returned instead — use that URL to access the file.',
    'Keep downloads small to avoid exceeding the LLM token limit. Do not override maximumDownloadSizeBytes unless it is strictly necessary to complete the task.',
  ].join('\n'),

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.amazonS3.test.description', {
      defaultMessage: 'Verifies AWS S3 connection by listing buckets',
    }),
    handler: async (ctx) => {
      ctx.log.debug('Amazon S3 test handler');

      try {
        const response = await listAmazonS3Buckets(ctx);

        if (!response.buckets) {
          return { ok: false, message: 'Failed to connect to Amazon S3' };
        }

        return {
          ok: true,
          message: `Successfully connected to Amazon S3. Found ${response.buckets.length} bucket(s)`,
        };
      } catch (error) {
        return {
          ok: false,
          message: `Failed to connect to Amazon S3: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        };
      }
    },
  },
};
