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
import { type ConnectorSpec } from '../../connector_spec';
import { downloadAmazonS3BucketObject, generateAmazonS3BucketObjectPresignedUrl, getAmazonS3BucketObjectMetadata, listAmazonS3BucketObjects, listAmazonS3Buckets } from './amazon_s3_api';

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
    supportedFeatureIds: ['workflows'],
  },
  auth: {
    types: ['aws_credentials'],
  },
  schema: z.object({
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
            'The AWS region where your S3 buckets are located (for example, us-east-1)',
        }),
      }),
  }),
  actions: {
    listBuckets: {
      isTool: true,
      input: z.object({
        region: z.string().optional().describe('The AWS region to list buckets from'),
        prefix: z.string().optional().describe('The prefix to filter buckets by'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          region?: string;
          prefix?: string;
        };

        let buckets: { name?: string, creationDate?: string }[] = [];

        let continuationToken: string | undefined = undefined;
        while (true) {
          const response = await listAmazonS3Buckets(ctx, typedInput.region, typedInput.prefix, undefined, continuationToken);
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
      input: z.object({
        bucket: z.string().min(1).describe('The name of the S3 bucket'),
        region: z.string().optional().describe('The region of the S3 bucket. If not specified, will attempt to auto-detect.'),
        prefix: z.string().optional().describe('The prefix to filter objects by'),
        continuationToken: z
          .string()
          .optional()
          .describe('Continuation token for paginated listing'),
        maxKeys: z
          .number()
          .int()
          .positive()
          .optional()
          .describe('Maximum number of keys to return in a single page. Defaults to 1000. Maximum allowed is 1000.')
          .default(1000),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          bucket: string;
          region?: string;
          prefix?: string;
          continuationToken?: string;
          maxKeys?: number;
        };

        return await listAmazonS3BucketObjects(ctx, typedInput.bucket, typedInput.region, typedInput.prefix, typedInput.maxKeys, typedInput.continuationToken);
      },
    },

    downloadFile: {
      isTool: true,
      input: z.object({
        bucket: z.string().min(1).describe('The name of the S3 bucket'),
        key: z.string().min(1).describe('The key (path) of the file to download'),
        maximumDownloadSizeBytes: z
          .number()
          .positive()
          .optional()
          .describe(
            'Maximum file size in bytes that can be downloaded for the file content. If the file exceeds this size, a pre-signed URL will be returned instead of the content.'
          ),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          bucket: string;
          key: string;
          maximumDownloadSizeBytes?: number;
        };

        const metadata = await getAmazonS3BucketObjectMetadata(ctx, typedInput.bucket, typedInput.key);
        if (!metadata) {
          throw new Error('Failed to retrieve file metadata');
        }

        const contentType = metadata.contentType || 'application/octet-stream';
        const maxSize = typedInput.maximumDownloadSizeBytes ?? MAX_DOWNLOAD_FILE_SIZE_BYTES;
        if (metadata.contentLength && metadata.contentLength > maxSize) {
          const urlString = await generateAmazonS3BucketObjectPresignedUrl(ctx, typedInput.bucket, typedInput.key, 300);

          return {
            bucket: typedInput.bucket,
            key: typedInput.key,
            contentType,
            contentLength: metadata.contentLength,
            lastModified: metadata.lastModified,
            etag: metadata.eTag,
            contentUrl: urlString,
            message: `File size (${metadata.contentLength} bytes) exceeds maximum downloadable size (${maxSize} bytes). Access the file using the provided link.`,
          };
        }

        return await downloadAmazonS3BucketObject(ctx, typedInput.bucket, typedInput.key);
      },
    },
  },

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
