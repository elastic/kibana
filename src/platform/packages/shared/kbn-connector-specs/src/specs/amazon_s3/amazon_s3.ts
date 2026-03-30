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
import downloadFileWorkflow from './workflows/download_file.yaml';
import listBucketObjectsWorkflow from './workflows/list_bucket_objects.yaml';
import listBucketsWorkflow from './workflows/list_buckets.yaml';

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
    supportedFeatureIds: ['workflows', 'agentBuilder'],
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
            'The AWS Region where your S3 buckets are located (for example, us-east-1)',
        }),
      }),
  }),
  actions: {
    listBuckets: {
      isTool: true,
      input: z.object({
        region: z.string().optional().describe('The optional AWS region to list buckets from'),
        prefix: z.string().optional().describe('The prefix to filter buckets by'),
      }),
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
      input: z.object({
        bucket: z.string().min(1).describe('The name of the S3 bucket'),
        region: z
          .string()
          .optional()
          .describe(
            'The optional region of the S3 bucket. If not specified, will attempt to auto-detect.'
          ),
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
          .describe(
            'Maximum number of keys to return in a single page. Defaults to 1000. Maximum allowed is 1000.'
          )
          .default(1000),
      }),
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

  agentBuilderWorkflows: [downloadFileWorkflow, listBucketObjectsWorkflow, listBucketsWorkflow],

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
