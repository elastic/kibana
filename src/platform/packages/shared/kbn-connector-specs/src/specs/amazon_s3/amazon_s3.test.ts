/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ListBucketsCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { ActionContext } from '../../connector_spec';

let mockS3Send: jest.Mock;
let mockGetSignedUrl: jest.Mock;

jest.mock('@aws-sdk/client-s3', () => {
  const originalModule = jest.requireActual('@aws-sdk/client-s3');
  return {
    ...originalModule,
    S3Client: jest.fn().mockImplementation(() => {
      mockS3Send = jest.fn();
      return {
        send: mockS3Send,
      };
    }),
  };
});

// Mock the s3-request-presigner before loading the module under test
jest.doMock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

// Load the module under test after mocks are in place
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AmazonS3 } = require('./amazon_s3');

describe('AmazonS3', () => {
  const mockContext = {
    config: {
      accessKeyId: 'access-key-id',
      secretAccessKey: 'secret-access-key',
      region: 'us-east-1',
    },
    log: {
      debug: jest.fn(),
      error: jest.fn(),
    },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.resetAllMocks();

    mockS3Send = jest.fn();
    (S3Client as jest.Mock).mockImplementation(() => ({
      send: mockS3Send,
    }));

    // obtain the mocked getSignedUrl function
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    mockGetSignedUrl = require('@aws-sdk/s3-request-presigner').getSignedUrl as jest.Mock;
    mockGetSignedUrl.mockReset();
  });

  it('should be defined', () => {
    expect(AmazonS3).toBeDefined();
  });
  it('should list buckets', async () => {
    mockS3Send.mockResolvedValue({
      Buckets: [
        {
          Name: 'bucket-1',
          BucketRegion: 'us-east-1',
          CreationDate: new Date('2025-01-01T00:00:00.000Z'),
        },
        {
          Name: 'bucket-2',
          BucketRegion: 'us-west-2',
          CreationDate: new Date('2025-01-02T00:00:00.000Z'),
        },
        {
          Name: 'bucket-3',
          BucketRegion: 'eu-central-1',
          CreationDate: new Date('2025-01-03T00:00:00.000Z'),
        },
      ],
      ContinuationToken: undefined,
    });

    const result = await AmazonS3.actions.listBuckets.handler(mockContext, {});

    expect(mockS3Send).toHaveBeenCalledTimes(1);
    const firstCommand = mockS3Send.mock.calls[0][0] as ListBucketsCommand;
    expect(firstCommand).toBeInstanceOf(ListBucketsCommand);
    expect(firstCommand.input).toEqual({
      ContinuationToken: undefined,
      Prefix: undefined,
    });
    expect(result).toEqual([
      {
        region: 'us-east-1',
        name: 'bucket-1',
        creationDate: '2025-01-01T00:00:00.000Z',
      },
      {
        region: 'us-west-2',
        name: 'bucket-2',
        creationDate: '2025-01-02T00:00:00.000Z',
      },
      {
        region: 'eu-central-1',
        name: 'bucket-3',
        creationDate: '2025-01-03T00:00:00.000Z',
      },
    ]);
  });

  it('should list buckets with pagination', async () => {
    mockS3Send
      .mockResolvedValueOnce({
        Buckets: [
          {
            Name: 'bucket-1',
            BucketRegion: 'us-east-1',
            CreationDate: new Date('2025-01-01T00:00:00.000Z'),
          },
        ],
        ContinuationToken: 'next-token',
      })
      .mockResolvedValueOnce({
        Buckets: [
          {
            Name: 'bucket-2',
            BucketRegion: 'us-west-2',
            CreationDate: new Date('2025-01-02T00:00:00.000Z'),
          },
        ],
        ContinuationToken: undefined,
      });

    const result = await AmazonS3.actions.listBuckets.handler(mockContext, {});

    expect(mockS3Send).toHaveBeenCalledTimes(2);
    const firstCommand = mockS3Send.mock.calls[0][0] as ListBucketsCommand;
    const secondCommand = mockS3Send.mock.calls[1][0] as ListBucketsCommand;
    expect(firstCommand.input).toEqual({
      ContinuationToken: undefined,
      Prefix: undefined,
    });
    expect(secondCommand.input).toEqual({
      ContinuationToken: 'next-token',
      Prefix: undefined,
    });
    expect(result).toEqual([
      {
        region: 'us-east-1',
        name: 'bucket-1',
        creationDate: '2025-01-01T00:00:00.000Z',
      },
      {
        region: 'us-west-2',
        name: 'bucket-2',
        creationDate: '2025-01-02T00:00:00.000Z',
      },
    ]);
  });

  it('should list buckets with a prefix', async () => {
    mockS3Send.mockResolvedValue({
      Buckets: [
        {
          Name: 'prefix-bucket-1',
          BucketRegion: 'us-east-1',
          CreationDate: new Date('2025-01-04T00:00:00.000Z'),
        },
      ],
      ContinuationToken: undefined,
    });

    const result = await AmazonS3.actions.listBuckets.handler(mockContext, {
      prefix: 'prefix-',
    });

    expect(mockS3Send).toHaveBeenCalledTimes(1);
    const firstCommand = mockS3Send.mock.calls[0][0] as ListBucketsCommand;
    expect(firstCommand.input).toEqual({
      ContinuationToken: undefined,
      Prefix: 'prefix-',
    });
    expect(result).toEqual([
      {
        region: 'us-east-1',
        name: 'prefix-bucket-1',
        creationDate: '2025-01-04T00:00:00.000Z',
      },
    ]);
  });

  it('should return an empty list when buckets are undefined', async () => {
    mockS3Send.mockResolvedValue({
      Buckets: undefined,
      ContinuationToken: undefined,
    });

    const result = await AmazonS3.actions.listBuckets.handler(mockContext, {});

    expect(mockS3Send).toHaveBeenCalledTimes(1);
    const firstCommand = mockS3Send.mock.calls[0][0] as ListBucketsCommand;
    expect(firstCommand.input).toEqual({
      ContinuationToken: undefined,
      Prefix: undefined,
    });
    expect(result).toEqual([]);
  });

  it('should throw when listing buckets fails', async () => {
    const error = new Error('Access denied');
    error.name = 'AccessDenied';
    mockS3Send.mockRejectedValue(error);

    await expect(AmazonS3.actions.listBuckets.handler(mockContext, {})).rejects.toThrow(
      'AWS S3 error (AccessDenied): Access denied'
    );
    expect(mockContext.log.error).toHaveBeenCalledWith(`Failed to list S3 buckets: ${error}`);
  });

  it('should list bucket objects without pagination', async () => {
    mockS3Send.mockResolvedValue({
      Contents: [
        {
          Key: 'file-1.txt',
          Size: 128,
          LastModified: new Date('2025-01-05T00:00:00.000Z'),
          StorageClass: 'STANDARD',
        },
        {
          Key: 'file-2.txt',
          Size: 256,
          LastModified: new Date('2025-01-06T00:00:00.000Z'),
          StorageClass: 'STANDARD_IA',
        },
      ],
      IsTruncated: false,
      NextContinuationToken: undefined,
    });

    const result = await AmazonS3.actions.listBucketObjects.handler(mockContext, {
      bucket: 'my-bucket',
    });

    expect(mockS3Send).toHaveBeenCalledTimes(1);
    const firstCommand = mockS3Send.mock.calls[0][0] as ListObjectsV2Command;
    expect(firstCommand).toBeInstanceOf(ListObjectsV2Command);
    expect(firstCommand.input).toEqual({
      Bucket: 'my-bucket',
      ContinuationToken: undefined,
      Prefix: undefined,
    });
    expect(result).toEqual({
      bucket: 'my-bucket',
      objectCount: 2,
      objects: [
        {
          key: 'file-1.txt',
          size: 128,
          lastModified: '2025-01-05T00:00:00.000Z',
          storageClass: 'STANDARD',
        },
        {
          key: 'file-2.txt',
          size: 256,
          lastModified: '2025-01-06T00:00:00.000Z',
          storageClass: 'STANDARD_IA',
        },
      ],
      isTruncated: false,
      nextContinuationToken: undefined,
    });
  });

  it('should list bucket objects with pagination', async () => {
    mockS3Send
      .mockResolvedValueOnce({
        Contents: [
          {
            Key: 'file-1.txt',
            Size: 128,
            LastModified: new Date('2025-01-05T00:00:00.000Z'),
            StorageClass: 'STANDARD',
          },
        ],
        IsTruncated: true,
        NextContinuationToken: 'next-token',
      })
      .mockResolvedValueOnce({
        Contents: [
          {
            Key: 'file-2.txt',
            Size: 256,
            LastModified: new Date('2025-01-06T00:00:00.000Z'),
            StorageClass: 'STANDARD_IA',
          },
        ],
        IsTruncated: false,
        NextContinuationToken: undefined,
      });

    const result = await AmazonS3.actions.listBucketObjects.handler(mockContext, {
      bucket: 'my-bucket',
      maxKeys: 1,
    });

    expect(result).toEqual({
      bucket: 'my-bucket',
      objectCount: 1,
      objects: [
        {
          key: 'file-1.txt',
          size: 128,
          lastModified: '2025-01-05T00:00:00.000Z',
          storageClass: 'STANDARD',
        },
      ],
      isTruncated: true,
      nextContinuationToken: 'next-token',
    });

    const secondResult = await AmazonS3.actions.listBucketObjects.handler(mockContext, {
      bucket: 'my-bucket',
      maxKeys: 1,
      continuationToken: result.nextContinuationToken,
    });

    expect(secondResult).toEqual({
      bucket: 'my-bucket',
      objectCount: 1,
      objects: [
        {
          key: 'file-2.txt',
          size: 256,
          lastModified: '2025-01-06T00:00:00.000Z',
          storageClass: 'STANDARD_IA',
        },
      ],
      isTruncated: false,
      nextContinuationToken: undefined,
    });

    expect(mockS3Send).toHaveBeenCalledTimes(2);
    const firstCommand = mockS3Send.mock.calls[0][0] as ListObjectsV2Command;
    const secondCommand = mockS3Send.mock.calls[1][0] as ListObjectsV2Command;

    expect(firstCommand.input).toEqual({
      Bucket: 'my-bucket',
      ContinuationToken: undefined,
      MaxKeys: 1,
      Prefix: undefined,
    });
    expect(secondCommand.input).toEqual({
      Bucket: 'my-bucket',
      ContinuationToken: 'next-token',
      MaxKeys: 1,
      Prefix: undefined,
    });
  });

  it('should list bucket objects with a prefix', async () => {
    mockS3Send.mockResolvedValue({
      Contents: [
        {
          Key: 'prefix/file-1.txt',
          Size: 512,
          LastModified: new Date('2025-01-07T00:00:00.000Z'),
          StorageClass: 'STANDARD',
        },
      ],
      IsTruncated: false,
      NextContinuationToken: undefined,
    });

    const result = await AmazonS3.actions.listBucketObjects.handler(mockContext, {
      bucket: 'my-bucket',
      prefix: 'prefix/',
    });

    expect(mockS3Send).toHaveBeenCalledTimes(1);
    const firstCommand = mockS3Send.mock.calls[0][0] as ListObjectsV2Command;
    expect(firstCommand.input).toEqual({
      Bucket: 'my-bucket',
      ContinuationToken: undefined,
      Prefix: 'prefix/',
    });
    expect(result).toEqual({
      bucket: 'my-bucket',
      objectCount: 1,
      objects: [
        {
          key: 'prefix/file-1.txt',
          size: 512,
          lastModified: '2025-01-07T00:00:00.000Z',
          storageClass: 'STANDARD',
        },
      ],
      isTruncated: false,
      nextContinuationToken: undefined,
    });
  });

  it('should throw when listing bucket objects fails', async () => {
    const error = new Error('Access denied');
    error.name = 'AccessDenied';
    mockS3Send.mockRejectedValue(error);

    await expect(
      AmazonS3.actions.listBucketObjects.handler(mockContext, {
        bucket: 'my-bucket',
      })
    ).rejects.toThrow('AWS S3 error (AccessDenied): Access denied');
    expect(mockContext.log.error).toHaveBeenCalledWith(
      `Failed to list objects in S3 bucket (my-bucket): ${error}`
    );
  });

  it('should download a file successfully', async () => {
    const fileContent = 'Hello, World!';
    const base64Content = Buffer.from(fileContent).toString('base64');

    mockS3Send
      .mockResolvedValueOnce({
        ContentType: 'text/plain',
        ContentLength: fileContent.length,
        LastModified: new Date('2025-01-10T00:00:00.000Z'),
        ETag: '"abc123"',
      })
      .mockResolvedValueOnce({
        Body: {
          // Some AWS SDK environments provide transformToByteArray(), ensure tests mock it
          transformToByteArray: async () => new Uint8Array(Buffer.from(fileContent)),
          getReader: () => {
            let done = false;
            return {
              read: async () => {
                if (!done) {
                  done = true;
                  return {
                    done: false,
                    value: new Uint8Array(Buffer.from(fileContent)),
                  };
                }
                return { done: true };
              },
            };
          },
        },
      });

    const result = await AmazonS3.actions.downloadFile.handler(mockContext, {
      bucket: 'my-bucket',
      key: 'test-file.txt',
    });

    expect(mockS3Send).toHaveBeenCalledTimes(2);
    const headCommand = mockS3Send.mock.calls[0][0] as HeadObjectCommand;
    const getCommand = mockS3Send.mock.calls[1][0] as GetObjectCommand;

    expect(headCommand).toBeInstanceOf(HeadObjectCommand);
    expect(headCommand.input).toEqual({
      Bucket: 'my-bucket',
      Key: 'test-file.txt',
    });

    expect(getCommand).toBeInstanceOf(GetObjectCommand);
    expect(getCommand.input).toEqual({
      Bucket: 'my-bucket',
      Key: 'test-file.txt',
    });

    expect(result).toEqual({
      bucket: 'my-bucket',
      key: 'test-file.txt',
      contentType: 'text/plain',
      contentLength: fileContent.length,
      lastModified: '2025-01-10T00:00:00.000Z',
      etag: '"abc123"',
      content: base64Content,
      encoding: 'base64',
    });

    // Verify content can be decoded back to original
    expect(Buffer.from(result.content, 'base64').toString()).toBe(fileContent);
    expect(result.encoding).toBe('base64');
    expect(result.contentType).toBe('text/plain');
    expect(result.contentLength).toBe(fileContent.length);
  });

  it('should throw when downloading a file fails', async () => {
    const error = new Error('File not found');
    error.name = 'NoSuchKey';
    mockS3Send.mockRejectedValue(error);

    await expect(
      AmazonS3.actions.downloadFile.handler(mockContext, {
        bucket: 'my-bucket',
        key: 'missing-file.txt',
      })
    ).rejects.toThrow('AWS S3 error (NoSuchKey): File not found');

    expect(mockContext.log.error).toHaveBeenCalledWith(
      `Failed to download file from S3 (bucket: my-bucket, key: missing-file.txt): ${error}`
    );
  });

  it('should return a presigned URL when file size exceeds maximum download size', async () => {
    mockS3Send.mockResolvedValueOnce({
      ContentType: 'application/octet-stream',
      ContentLength: 999999,
      LastModified: new Date('2025-02-01T00:00:00.000Z'),
      ETag: '"etag123"',
    });

    mockGetSignedUrl.mockResolvedValue('https://signed-url.example.com');

    const result = await AmazonS3.actions.downloadFile.handler(mockContext, {
      bucket: 'big-bucket',
      key: 'big-file.bin',
    });

    expect(mockS3Send).toHaveBeenCalledTimes(1);
    const headCommand = mockS3Send.mock.calls[0][0] as HeadObjectCommand;
    expect(headCommand).toBeInstanceOf(HeadObjectCommand);
    expect(headCommand.input).toEqual({
      Bucket: 'big-bucket',
      Key: 'big-file.bin',
    });

    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
    const presignArgs = mockGetSignedUrl.mock.calls[0];
    const presignCommand = presignArgs[1] as GetObjectCommand;
    const presignOptions = presignArgs[2];

    expect(presignCommand).toBeInstanceOf(GetObjectCommand);
    expect(presignCommand.input).toEqual({ Bucket: 'big-bucket', Key: 'big-file.bin' });
    expect(presignOptions).toEqual({ expiresIn: 300 });

    expect(result).toEqual({
      bucket: 'big-bucket',
      key: 'big-file.bin',
      contentType: 'application/octet-stream',
      contentLength: 999999,
      lastModified: '2025-02-01T00:00:00.000Z',
      etag: '"etag123"',
      contentUrl: 'https://signed-url.example.com',
      message: expect.stringContaining(
        'File size (999999 bytes) exceeds maximum downloadable size (131072 bytes). Access the file using the provided link.'
      ),
    });
  });
});
