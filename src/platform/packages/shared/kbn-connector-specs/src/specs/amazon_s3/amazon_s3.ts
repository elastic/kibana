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
import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

/**
 * Creates an S3 client using credentials and configuration.
 */
function createS3Client(config: {
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
}): S3Client {
  return new S3Client({
    region: config.region || 'us-east-1',
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
          defaultMessage: 'Access Key ID',
        }),
        helpText: i18n.translate('core.kibanaConnectorSpecs.amazonS3.config.accessKeyId.helpText', {
          defaultMessage: 'Your AWS Access Key ID',
        }),
      }),
    secretAccessKey: z
      .string()
      .min(1)
      .describe('AWS Secret Access Key')
      .meta({
        sensitive: true,
        widget: 'password',
        label: i18n.translate(
          'core.kibanaConnectorSpecs.amazonS3.config.secretAccessKey.label',
          {
            defaultMessage: 'Secret Access Key',
          }
        ),
        helpText: i18n.translate(
          'core.kibanaConnectorSpecs.amazonS3.config.secretAccessKey.helpText',
          {
            defaultMessage: 'Your AWS Secret Access Key',
          }
        ),
      }),
    region: z
      .string()
      .default('us-east-1')
      .describe('AWS region')
      .meta({
        widget: 'text',
        label: i18n.translate('core.kibanaConnectorSpecs.amazonS3.config.region.label', {
          defaultMessage: 'AWS Region',
        }),
        placeholder: 'us-east-1',
        helpText: i18n.translate('core.kibanaConnectorSpecs.amazonS3.config.region.helpText', {
          defaultMessage: 'The AWS region where your S3 buckets are located (e.g., us-east-1)',
        }),
      }),
  }),
  actions: {
    listBuckets: {
      isTool: true,
      input: z.object({}),
      handler: async (ctx, input) => {
        const config = ctx.config as {
          accessKeyId: string;
          secretAccessKey: string;
          region?: string;
        };

        try {
          const s3Client = createS3Client(config);
          const command = new ListBucketsCommand({});
          const response = await s3Client.send(command);

          return {
            buckets: (response.Buckets || []).map((bucket) => ({
              name: bucket.Name,
              creationDate: bucket.CreationDate?.toISOString(),
            })),
          };
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
      }),
      handler: async (ctx, input) => {
        const config = ctx.config as {
          accessKeyId: string;
          secretAccessKey: string;
          region?: string;
        };
        const typedInput = input as {
          bucket: string;
        };

        try {
          const s3Client = createS3Client(config);
          const objects: Array<{
            key?: string;
            size?: number;
            lastModified?: string;
            storageClass?: string;
          }> = [];
          let continuationToken: string | undefined;
          let isTruncated = true;

          // Recursively list all objects using pagination
          while (isTruncated) {
            const command = new ListObjectsV2Command({
              Bucket: typedInput.bucket,
              ContinuationToken: continuationToken,
            });
            const response = await s3Client.send(command);

            if (response.Contents) {
              objects.push(
                ...response.Contents.map((obj) => ({
                  key: obj.Key,
                  size: obj.Size,
                  lastModified: obj.LastModified?.toISOString(),
                  storageClass: obj.StorageClass,
                }))
              );
            }

            isTruncated = response.IsTruncated || false;
            continuationToken = response.NextContinuationToken;
          }

          return {
            bucket: typedInput.bucket,
            objectCount: objects.length,
            objects,
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
      }),
      handler: async (ctx, input) => {
        const config = ctx.config as {
          accessKeyId: string;
          secretAccessKey: string;
          region?: string;
        };
        const typedInput = input as {
          bucket: string;
          key: string;
        };

        try {
          const s3Client = createS3Client(config);

          // First, get file metadata
          const headCommand = new HeadObjectCommand({
            Bucket: typedInput.bucket,
            Key: typedInput.key,
          });
          const metadata = await s3Client.send(headCommand);

          // Download the file content
          const getCommand = new GetObjectCommand({
            Bucket: typedInput.bucket,
            Key: typedInput.key,
          });
          const response = await s3Client.send(getCommand);

          // Convert stream to buffer
          if (!response.Body) {
            throw new Error('No content in response body');
          }

          const chunks: Uint8Array[] = [];
          const stream = response.Body as ReadableStream;

          // Handle the stream based on its type
          if (typeof stream.getReader === 'function') {
            const reader = stream.getReader();
            let done = false;
            while (!done) {
              const result = await reader.read();
              done = result.done;
              if (result.value) {
                chunks.push(result.value);
              }
            }
          } else {
            // Fallback for Node.js streams
            const nodeStream = stream as unknown as NodeJS.ReadableStream;
            for await (const chunk of nodeStream) {
              chunks.push(chunk as Uint8Array);
            }
          }

          // Combine chunks into a single buffer
          const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
          const buffer = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of chunks) {
            buffer.set(chunk, offset);
            offset += chunk.length;
          }

          // Convert to base64
          const base64Content = Buffer.from(buffer).toString('base64');

          return {
            bucket: typedInput.bucket,
            key: typedInput.key,
            contentType: metadata.ContentType,
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
        region?: string;
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
