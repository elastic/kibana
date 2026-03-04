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
import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { UISchemas, type ConnectorSpec } from '../../connector_spec';

/**
 * Default maximum file size that can be downloaded (128 kilobytes)
 * If the user requests a file larger than this, we will return a pre-signed URL for them to download the file directly from S3 instead of through Kibana.
 */
const MAX_DOWNLOAD_FILE_SIZE_BYTES = 128 * 1024;

/**
 * Creates an S3 client using credentials and configuration.
 */
function createS3Client(config: {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}): S3Client {
  return new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

/**
 * Extracts and throws a meaningful error from AWS S3 API responses.
 */
function throwS3Error(error: unknown): void {
  const awsError = error as {
    name?: string;
    message?: string;
    $metadata?: { httpStatusCode?: number };
  };
  if (awsError.name && awsError.message) {
    throw new Error(`AWS S3 error (${awsError.name}): ${awsError.message}`);
  }
}

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
  schema: z.object({
    accessKeyId: z
      .string()
      .min(1)
      .describe('AWS Access Key ID')
      .meta({
        sensitive: false,
        widget: 'text',
        label: i18n.translate('core.kibanaConnectorSpecs.amazonS3.config.accessKeyId.label', {
          defaultMessage: 'AWS Access Key ID',
        }),
        helpText: i18n.translate('core.kibanaConnectorSpecs.amazonS3.config.accessKeyId.helpText', {
          defaultMessage: 'Your AWS Access Key ID',
        }),
      }),
    secretAccessKey: UISchemas.secret()
      .describe('AWS Secret Access Key')
      .min(1)
      .meta({
        sensitive: true,
        widget: 'password',
        label: i18n.translate('core.kibanaConnectorSpecs.amazonS3.config.secretAccessKey.label', {
          defaultMessage: 'Secret Access Key',
        }),
        helpText: i18n.translate(
          'core.kibanaConnectorSpecs.amazonS3.config.secretAccessKey.helpText',
          {
            defaultMessage: 'Your AWS Secret Access Key',
          }
        ),
      }),
    region: z
      .string()
      .min(1)
      .describe('AWS region')
      .meta({
        widget: 'text',
        label: i18n.translate('core.kibanaConnectorSpecs.amazonS3.config.region.label', {
          defaultMessage: 'AWS Region',
        }),
        placeholder: 'us-east-1',
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
        const config = ctx.config as {
          accessKeyId: string;
          secretAccessKey: string;
          region: string;
        };
        const typedInput = input as {
          region?: string;
          prefix?: string;
        };

        try {
          const s3Client = createS3Client(config);
          const objects: Array<{
            region?: string;
            name?: string;
            creationDate?: string;
          }> = [];
          let continuationToken: string | undefined;

          do {
            const command = new ListBucketsCommand({
              ContinuationToken: continuationToken,
              Prefix: typedInput.prefix,
              BucketRegion: typedInput.region,
            });
            const response = await s3Client.send(command);
            if (response.Buckets) {
              objects.push(
                ...response.Buckets.map((bucket) => ({
                  region: bucket.BucketRegion,
                  name: bucket.Name,
                  creationDate: bucket.CreationDate?.toISOString(),
                }))
              );
            }
            continuationToken = response.ContinuationToken;
          } while (continuationToken);

          return objects;
        } catch (error: unknown) {
          ctx.log.error(`Failed to list S3 buckets: ${error}`);
          throwS3Error(error);
          throw error;
        }
      },
    },

    listBucketObjects: {
      isTool: true,
      input: z.object({
        bucket: z.string().min(1).describe('The name of the S3 bucket'),
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
          .describe('Maximum number of keys to return in a single page')
          .default(1000),
      }),
      handler: async (ctx, input) => {
        const config = ctx.config as {
          accessKeyId: string;
          secretAccessKey: string;
          region: string;
        };
        const typedInput = input as {
          bucket: string;
          prefix?: string;
          continuationToken?: string;
          maxKeys?: number;
        };

        try {
          const s3Client = createS3Client(config);

          const command = new ListObjectsV2Command({
            Bucket: typedInput.bucket,
            ContinuationToken: typedInput.continuationToken,
            Prefix: typedInput.prefix,
            MaxKeys: typedInput.maxKeys,
          });

          const response = await s3Client.send(command);

          const pageObjects = (response.Contents || []).map((obj) => ({
            key: obj.Key,
            size: obj.Size,
            lastModified: obj.LastModified?.toISOString(),
            storageClass: obj.StorageClass,
          }));

          return {
            bucket: typedInput.bucket,
            objectCount: pageObjects.length,
            objects: pageObjects,
            nextContinuationToken: response.NextContinuationToken,
            isTruncated: response.IsTruncated || false,
          };
        } catch (error: unknown) {
          ctx.log.error(`Failed to list objects in S3 bucket (${typedInput.bucket}): ${error}`);
          throwS3Error(error);
          throw error;
        }
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
        const config = ctx.config as {
          accessKeyId: string;
          secretAccessKey: string;
          region: string;
        };
        const typedInput = input as {
          bucket: string;
          key: string;
          maximumDownloadSizeBytes?: number;
        };

        try {
          const s3Client = createS3Client(config);

          const headCommand = new HeadObjectCommand({
            Bucket: typedInput.bucket,
            Key: typedInput.key,
          });
          const metadata = await s3Client.send(headCommand);

          if (!metadata) {
            throw new Error('Failed to retrieve file metadata');
          }

          const contentType = metadata.ContentType || 'application/octet-stream';
          const maxSize = typedInput.maximumDownloadSizeBytes ?? MAX_DOWNLOAD_FILE_SIZE_BYTES;
          if (metadata.ContentLength && metadata.ContentLength > maxSize) {
            const urlString = await getSignedUrl(
              s3Client,
              new GetObjectCommand({
                Bucket: typedInput.bucket,
                Key: typedInput.key,
              }),
              { expiresIn: 300 } // URL expires in 5 minutes
            );

            return {
              bucket: typedInput.bucket,
              key: typedInput.key,
              contentType,
              contentLength: metadata.ContentLength,
              lastModified: metadata.LastModified?.toISOString(),
              etag: metadata.ETag,
              contentUrl: urlString,
              message: `File size (${metadata.ContentLength} bytes) exceeds maximum downloadable size (${maxSize} bytes). Access the file using the provided link.`,
            };
          }

          const getCommand = new GetObjectCommand({
            Bucket: typedInput.bucket,
            Key: typedInput.key,
          });
          const response = await s3Client.send(getCommand);

          if (!response.Body) {
            throw new Error('No content in response body');
          }

          const contentBytes = await response.Body.transformToByteArray();
          const base64Content = contentBytes
            ? Buffer.from(contentBytes).toString('base64')
            : undefined;

          if (!base64Content) {
            throw new Error('Failed to read file content');
          }

          return {
            bucket: typedInput.bucket,
            key: typedInput.key,
            contentType,
            contentLength: metadata.ContentLength,
            lastModified: metadata.LastModified?.toISOString(),
            etag: metadata.ETag,
            content: base64Content,
            encoding: 'base64',
          };
        } catch (error: unknown) {
          ctx.log.error(
            `Failed to download file from S3 (bucket: ${typedInput.bucket}, key: ${typedInput.key}): ${error}`
          );
          throwS3Error(error);
          throw error;
        }
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.amazonS3.test.description', {
      defaultMessage: 'Verifies AWS S3 connection by listing buckets',
    }),
    handler: async (ctx) => {
      ctx.log.debug('Amazon S3 test handler');
      const config = ctx.config as {
        accessKeyId: string;
        secretAccessKey: string;
        region: string;
      };

      try {
        const s3Client = createS3Client(config);
        const command = new ListBucketsCommand({});
        const response = await s3Client.send(command);

        if (!response.Buckets) {
          return { ok: false, message: 'Failed to connect to Amazon S3' };
        }

        return {
          ok: true,
          message: `Successfully connected to Amazon S3. Found ${response.Buckets.length} bucket(s)`,
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
