/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';

const mockListAmazonS3Buckets = jest.fn();
const mockListAmazonS3BucketObjects = jest.fn();
const mockGetAmazonS3BucketObjectMetadata = jest.fn();
const mockGenerateAmazonS3BucketObjectPresignedUrl = jest.fn();
const mockDownloadAmazonS3BucketObject = jest.fn();

jest.mock('./amazon_s3_api', () => ({
  listAmazonS3Buckets: mockListAmazonS3Buckets,
  listAmazonS3BucketObjects: mockListAmazonS3BucketObjects,
  getAmazonS3BucketObjectMetadata: mockGetAmazonS3BucketObjectMetadata,
  generateAmazonS3BucketObjectPresignedUrl: mockGenerateAmazonS3BucketObjectPresignedUrl,
  downloadAmazonS3BucketObject: mockDownloadAmazonS3BucketObject,
}));

// Load the module under test after mocks are in place
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AmazonS3 } = require('./amazon_s3');

describe('AmazonS3', () => {
  const mockClient = {
    get: jest.fn(),
    head: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    config: {
      region: 'us-east-1',
    },
    secrets: {
      authType: 'aws_credentials',
      accessKeyId: 'example_access_key',
      secretAccessKey: 'example_secret_key',
    },
    log: {},
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should list buckets', async () => {
    mockListAmazonS3Buckets.mockResolvedValue({
      buckets: [
        {
          name: 'test-bucket-name',
          creationDate: 'ISO_Timestamp',
        },
      ],
      nextContinuationToken: undefined,
      isTruncated: false,
    });

    const result = await AmazonS3.actions.listBuckets.handler(mockContext, {});

    expect(mockListAmazonS3Buckets).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
      {
        name: 'test-bucket-name',
        creationDate: 'ISO_Timestamp',
      },
    ]);
  });

  it('should list buckets with pagination', async () => {
    mockListAmazonS3Buckets
      .mockResolvedValueOnce({
        buckets: [
          {
            name: 'test-bucket-name',
            creationDate: 'ISO_Timestamp',
          },
        ],
        nextContinuationToken: 'next-token',
        isTruncated: true,
      })
      .mockResolvedValueOnce({
        buckets: [
          {
            name: 'second-bucket-name',
            creationDate: 'ISO_Timestamp',
          },
        ],
        nextContinuationToken: undefined,
        isTruncated: false,
      });

    const result = await AmazonS3.actions.listBuckets.handler(mockContext, {});

    expect(mockListAmazonS3Buckets).toHaveBeenCalledTimes(2);
    expect(result).toEqual([
      {
        name: 'test-bucket-name',
        creationDate: 'ISO_Timestamp',
      },
      {
        name: 'second-bucket-name',
        creationDate: 'ISO_Timestamp',
      },
    ]);
  });

  it('should list bucket objects without pagination', async () => {
    mockListAmazonS3BucketObjects.mockResolvedValue({
      bucket: 'test-bucket-name',
      objectCount: 2,
      objects: [
        {
          key: 'test-object-key',
          size: 12345,
          lastModified: 'ISO_Timestamp',
          storageClass: 'STANDARD',
        },
        {
          key: 'second-test-object-key',
          size: 67890,
          lastModified: 'ISO_Timestamp',
          storageClass: 'STANDARD_IA',
        },
      ],
      nextContinuationToken: undefined,
      isTruncated: false,
    });

    const result = await AmazonS3.actions.listBucketObjects.handler(mockContext, {
      bucket: 'test-bucket-name',
    });

    expect(mockListAmazonS3BucketObjects).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      bucket: 'test-bucket-name',
      objectCount: 2,
      objects: [
        {
          key: 'test-object-key',
          size: 12345,
          lastModified: 'ISO_Timestamp',
          storageClass: 'STANDARD',
        },
        {
          key: 'second-test-object-key',
          size: 67890,
          lastModified: 'ISO_Timestamp',
          storageClass: 'STANDARD_IA',
        },
      ],
      nextContinuationToken: undefined,
      isTruncated: false,
    });
  });

  it('should list bucket objects with pagination', async () => {
    mockListAmazonS3BucketObjects
      .mockResolvedValueOnce({
        bucket: 'test-bucket-name',
        objectCount: 2,
        objects: [
          {
            key: 'test-object-key',
            size: 12345,
            lastModified: 'ISO_Timestamp',
            storageClass: 'STANDARD',
          },
        ],
        nextContinuationToken: 'next-token',
        isTruncated: true,
      })
      .mockResolvedValueOnce({
        bucket: 'test-bucket-name',
        objectCount: 2,
        objects: [
          {
            key: 'second-object-key',
            size: 98765,
            lastModified: 'ISO_Timestamp',
            storageClass: 'STANDARD',
          },
        ],
        nextContinuationToken: undefined,
        isTruncated: false,
      });

    const result = await AmazonS3.actions.listBucketObjects.handler(mockContext, {
      bucket: 'test-bucket-name',
      continuationToken: undefined,
    });

    expect(result).toEqual({
      bucket: 'test-bucket-name',
      objectCount: 2,
      objects: [
        {
          key: 'test-object-key',
          size: 12345,
          lastModified: 'ISO_Timestamp',
          storageClass: 'STANDARD',
        },
      ],
      nextContinuationToken: 'next-token',
      isTruncated: true,
    });

    const secondResult = await AmazonS3.actions.listBucketObjects.handler(mockContext, {
      bucket: 'test-bucket-name',
      continuationToken: result.nextContinuationToken,
    });

    expect(secondResult).toEqual({
      bucket: 'test-bucket-name',
      objectCount: 2,
      objects: [
        {
          key: 'second-object-key',
          size: 98765,
          lastModified: 'ISO_Timestamp',
          storageClass: 'STANDARD',
        },
      ],
      nextContinuationToken: undefined,
      isTruncated: false,
    });

    expect(mockListAmazonS3BucketObjects).toHaveBeenCalledTimes(2);
  });

  it('Should downloadFile with a small file and return its contents', async () => {
    mockGetAmazonS3BucketObjectMetadata.mockResolvedValue({
      bucket: 'test-bucket-name',
      key: 'test-object-key',
      lastModified: 'ISO_Timestamp',
      storageClass: 'STANDARD',
      acceptRanges: 'bytes',
      cacheControl: 'none',
      contentDisposition: 'none',
      contentEncoding: 'none',
      contentLanguage: 'none',
      contentLength: 1234,
      contentRange: 'none',
      contentType: 'text/plain',
      eTag: 'testetag',
      expires: 'none',
      region: 'us-east-1',
      server: 'host',
    });

    mockDownloadAmazonS3BucketObject.mockResolvedValue({
      bucket: 'test-bucket-name',
      key: 'test-object-key',
      contentType: 'text/plain',
      contentLength: 1234,
      lastModified: 'ISO_Timestamp',
      etag: 'testetag',
      content: 'test file content',
      encoding: 'base64',
    });

    const result = await AmazonS3.actions.downloadFile.handler(mockContext, {
      bucket: 'test-bucket-name',
      key: 'test-object-key',
    });

    expect(mockGetAmazonS3BucketObjectMetadata).toHaveBeenCalledTimes(1);
    expect(mockGenerateAmazonS3BucketObjectPresignedUrl).toHaveBeenCalledTimes(0);
    expect(mockDownloadAmazonS3BucketObject).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      bucket: 'test-bucket-name',
      key: 'test-object-key',
      contentType: 'text/plain',
      contentLength: 1234,
      lastModified: 'ISO_Timestamp',
      etag: 'testetag',
      content: 'test file content',
      encoding: 'base64',
    });
  });

  it('Should downloadFile with a large file and return a download URL with message', async () => {
    mockGetAmazonS3BucketObjectMetadata.mockResolvedValue({
      bucket: 'test-bucket-name',
      key: 'test-object-key',
      lastModified: 'ISO_Timestamp',
      storageClass: 'STANDARD',
      acceptRanges: 'bytes',
      cacheControl: 'none',
      contentDisposition: 'none',
      contentEncoding: 'none',
      contentLanguage: 'none',
      contentLength: 987654,
      contentRange: 'none',
      contentType: 'text/plain',
      eTag: 'testetag',
      expires: 'none',
      region: 'us-east-1',
      server: 'host',
    });

    mockGenerateAmazonS3BucketObjectPresignedUrl.mockResolvedValue('https://presigned-url');

    const result = await AmazonS3.actions.downloadFile.handler(mockContext, {
      bucket: 'test-bucket-name',
      key: 'test-object-key',
    });

    expect(mockGetAmazonS3BucketObjectMetadata).toHaveBeenCalledTimes(1);
    expect(mockGenerateAmazonS3BucketObjectPresignedUrl).toHaveBeenCalledTimes(1);
    expect(mockDownloadAmazonS3BucketObject).toHaveBeenCalledTimes(0);

    expect(result).toEqual({
      bucket: 'test-bucket-name',
      key: 'test-object-key',
      contentType: 'text/plain',
      contentLength: 987654,
      lastModified: 'ISO_Timestamp',
      etag: 'testetag',
      contentUrl: 'https://presigned-url',
      hasContent: false,
      message: `File size (987654 bytes) exceeds maximum downloadable size (131072 bytes). Access the file using the provided link.`,
    });
  });
});
