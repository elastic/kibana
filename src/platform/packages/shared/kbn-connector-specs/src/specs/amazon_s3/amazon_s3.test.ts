/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ListBucketsCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import type { ActionContext } from '../../connector_spec';
import { AmazonS3 } from './amazon_s3';

jest.mock('@aws-sdk/client-s3', () => {
  const originalModule = jest.requireActual('@aws-sdk/client-s3');
  return {
    ...originalModule,
    S3Client: jest.fn().mockImplementation(() => ({
      send: jest.fn(),
    })),
  };
});

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
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(AmazonS3).toBeDefined();
  });
  it('should list buckets', async () => {
    const mockSend = jest.fn().mockResolvedValue({
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

    (S3Client as jest.Mock).mockImplementation(() => ({
      send: mockSend,
    }));

    const result = await AmazonS3.actions.listBuckets.handler(mockContext, {});

    expect(mockSend).toHaveBeenCalledTimes(1);
    const firstCommand = mockSend.mock.calls[0][0] as ListBucketsCommand;
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
    const mockSend = jest.fn();

    mockSend
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

    (S3Client as jest.Mock).mockImplementation(() => ({
      send: mockSend,
    }));

    const result = await AmazonS3.actions.listBuckets.handler(mockContext, {});

    expect(mockSend).toHaveBeenCalledTimes(2);
    const firstCommand = mockSend.mock.calls[0][0] as ListBucketsCommand;
    const secondCommand = mockSend.mock.calls[1][0] as ListBucketsCommand;
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
    const mockSend = jest.fn().mockResolvedValue({
      Buckets: [
        {
          Name: 'prefix-bucket-1',
          BucketRegion: 'us-east-1',
          CreationDate: new Date('2025-01-04T00:00:00.000Z'),
        },
      ],
      ContinuationToken: undefined,
    });

    (S3Client as jest.Mock).mockImplementation(() => ({
      send: mockSend,
    }));

    const result = await AmazonS3.actions.listBuckets.handler(mockContext, {
      prefix: 'prefix-',
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const firstCommand = mockSend.mock.calls[0][0] as ListBucketsCommand;
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
    const mockSend = jest.fn().mockResolvedValue({
      Buckets: undefined,
      ContinuationToken: undefined,
    });

    (S3Client as jest.Mock).mockImplementation(() => ({
      send: mockSend,
    }));

    const result = await AmazonS3.actions.listBuckets.handler(mockContext, {});

    expect(mockSend).toHaveBeenCalledTimes(1);
    const firstCommand = mockSend.mock.calls[0][0] as ListBucketsCommand;
    expect(firstCommand.input).toEqual({
      ContinuationToken: undefined,
      Prefix: undefined,
    });
    expect(result).toEqual([]);
  });

  it('should throw when listing buckets fails', async () => {
    const error = new Error('Access denied');
    error.name = 'AccessDenied';
    const mockSend = jest.fn().mockRejectedValue(error);

    (S3Client as jest.Mock).mockImplementation(() => ({
      send: mockSend,
    }));

    await expect(AmazonS3.actions.listBuckets.handler(mockContext, {})).rejects.toThrow(
      'AWS S3 error (AccessDenied): Access denied'
    );
    expect(mockContext.log.error).toHaveBeenCalledWith(
      `Failed to list S3 buckets: ${error}`
    );
  });

  it('should list bucket objects without pagination', async () => {
    const mockSend = jest.fn().mockResolvedValue({
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

    (S3Client as jest.Mock).mockImplementation(() => ({
      send: mockSend,
    }));

    const result = await AmazonS3.actions.listBucketObjects.handler(mockContext, {
      bucket: 'my-bucket',
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const firstCommand = mockSend.mock.calls[0][0] as ListObjectsV2Command;
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
    });
  });

  it('should list bucket objects with pagination', async () => {
    const mockSend = jest.fn();

    mockSend
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

    (S3Client as jest.Mock).mockImplementation(() => ({
      send: mockSend,
    }));

    const result = await AmazonS3.actions.listBucketObjects.handler(mockContext, {
      bucket: 'my-bucket',
    });

    expect(mockSend).toHaveBeenCalledTimes(2);
    const firstCommand = mockSend.mock.calls[0][0] as ListObjectsV2Command;
    const secondCommand = mockSend.mock.calls[1][0] as ListObjectsV2Command;
    expect(firstCommand.input).toEqual({
      Bucket: 'my-bucket',
      ContinuationToken: undefined,
      Prefix: undefined,
    });
    expect(secondCommand.input).toEqual({
      Bucket: 'my-bucket',
      ContinuationToken: 'next-token',
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
    });
  });

  it('should list bucket objects with a prefix', async () => {
    const mockSend = jest.fn().mockResolvedValue({
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

    (S3Client as jest.Mock).mockImplementation(() => ({
      send: mockSend,
    }));

    const result = await AmazonS3.actions.listBucketObjects.handler(mockContext, {
      bucket: 'my-bucket',
      prefix: 'prefix/',
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const firstCommand = mockSend.mock.calls[0][0] as ListObjectsV2Command;
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
    });
  });

  it('should throw when listing bucket objects fails', async () => {
    const error = new Error('Access denied');
    error.name = 'AccessDenied';
    const mockSend = jest.fn().mockRejectedValue(error);

    (S3Client as jest.Mock).mockImplementation(() => ({
      send: mockSend,
    }));

    await expect(
      AmazonS3.actions.listBucketObjects.handler(mockContext, {
        bucket: 'my-bucket',
      })
    ).rejects.toThrow('AWS S3 error (AccessDenied): Access denied');
    expect(mockContext.log.error).toHaveBeenCalledWith(
      `Failed to list objects in S3 bucket (my-bucket): ${error}`
    );
  });
});
