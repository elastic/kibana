/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import {
  listAmazonS3Buckets,
  listAmazonS3BucketObjects,
  getAmazonS3BucketObjectMetadata,
  generateAmazonS3BucketObjectPresignedUrl,
  downloadAmazonS3BucketObject,
} from './amazon_s3_api';

const mockSha256Hash = jest.fn();
const mockCalculateAWSA4Signature = jest.fn();

require('../../auth_types/aws_crypto_helpers');

jest.mock('../../auth_types/aws_crypto_helpers', () => ({
  sha256Hash: () => mockSha256Hash,
  calculateAWSA4Signature: () => mockCalculateAWSA4Signature,
}));

describe('amazon_s3_api exports', () => {
  const mockClient = {
    get: jest.fn(),
    head: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    config: { region: 'us-east-1' },
    secrets: { accessKeyId: 'test-access-key-id', secretAccessKey: 'test-secret-access-key' },
    log: { debug: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSha256Hash.mockResolvedValue('mocked-hash');
    mockCalculateAWSA4Signature.mockResolvedValue('mocked-signature');
  });

  it('should listAmazonS3BucketObjects without any buckets', async () => {
    mockClient.get.mockResolvedValueOnce({ data: responseListBucketsNoBuckets });

    const result = await listAmazonS3Buckets(mockContext, 'us-east-1');
    expect(result).toEqual({
      buckets: [],
      nextContinuationToken: undefined,
      isTruncated: false,
    });
    expect(mockClient.get).toBeCalledTimes(1);
  });

  it('should listAmazonS3Buckets with a single bucket', async () => {
    mockClient.get.mockResolvedValueOnce({ data: responseListBucketsSingleBucket });

    const result = await listAmazonS3Buckets(mockContext, 'us-east-1');
    expect(result).toEqual({
      buckets: [
        {
          name: 'test-bucket-name',
          creationDate: 'ISO_Timestamp',
        },
      ],
      nextContinuationToken: undefined,
      isTruncated: false,
    });
    expect(mockClient.get).toBeCalledTimes(1);
  });

  it('should listAmazonS3Buckets with multiple buckets', async () => {
    mockClient.get.mockResolvedValueOnce({ data: responseListBucketsMultipleBuckets });

    const result = await listAmazonS3Buckets(mockContext, 'us-east-1');
    expect(result).toEqual({
      buckets: [
        {
          name: 'test-bucket-name',
          creationDate: 'ISO_Timestamp',
        },
        {
          name: 'second-bucket-name',
          creationDate: 'ISO_Timestamp',
        },
      ],
      nextContinuationToken: 'continuation-token',
      isTruncated: false,
    });
    expect(mockClient.get).toBeCalledTimes(1);
  });

  it('should listAmazonS3BucketObjects with no objects in bucket', async () => {
    mockClient.get.mockResolvedValueOnce({ data: responseListBucketObjectsNoObjects });
    const result = await listAmazonS3BucketObjects(mockContext, 'test-bucket-name', 'us-east-1');
    expect(result).toEqual({
      bucket: 'test-bucket-name',
      objectCount: 0,
      objects: [],
      nextContinuationToken: undefined,
      isTruncated: false,
    });
    expect(mockClient.get).toBeCalledTimes(1);
  });

  it('should listAmazonS3BucketObjects with a single object in bucket', async () => {
    mockClient.get.mockResolvedValueOnce({ data: responseListBucketObjectsSingleObject });
    const result = await listAmazonS3BucketObjects(mockContext, 'test-bucket-name', 'us-east-1');
    expect(result).toEqual({
      bucket: 'test-bucket-name',
      objectCount: 1,
      objects: [
        {
          key: 'test-object-key',
          size: 12345,
          lastModified: 'ISO_Timestamp',
          storageClass: 'STANDARD',
        },
      ],
      nextContinuationToken: undefined,
      isTruncated: false,
    });
    expect(mockClient.get).toBeCalledTimes(1);
  });

  it('should listAmazonS3BucketObjects with a multiple objects in bucket', async () => {
    mockClient.get.mockResolvedValueOnce({ data: responseListBucketObjectsMultipleObjects });
    const result = await listAmazonS3BucketObjects(mockContext, 'test-bucket-name', 'us-east-1');
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
          key: 'second-object-key',
          size: 555222,
          lastModified: 'ISO_Timestamp',
          storageClass: 'STANDARD',
        },
      ],
      nextContinuationToken: 'continuation-token',
      isTruncated: true,
    });
    expect(mockClient.get).toBeCalledTimes(1);
  });

  it('should getAmazonS3BucketObjectMetadata', async () => {
    mockClient.head.mockResolvedValueOnce({ headers: responseGetBucketObjectMetadata });
    const result = await getAmazonS3BucketObjectMetadata(
      mockContext,
      'test-bucket-name',
      'test-object-key',
      'us-east-1'
    );
    expect(result).toEqual({
      bucket: 'test-bucket-name',
      key: 'test-object-key',
      acceptRanges: 'bytes',
      contentLength: 12345,
      contentType: 'application/octet-stream',
      lastModified: 'ISO_Timestamp',
      eTag: 'test-etag',
      cacheControl: 'no-cache',
      contentDisposition: 'attachment; filename="test-file-name"',
      contentEncoding: 'gzip',
      contentLanguage: 'en',
      contentRange: 'bytes 0-12344/12345',
      region: 'us-east-1',
      expires: 'Wed, 21 Oct 2025 07:28:00 GMT',
      server: 'AmazonS3',
      storageClass: 'STANDARD',
    });
    expect(mockClient.head).toBeCalledTimes(1);
  });

  it('should generate a Amazon S3 bucket object presigned url', async () => {
    const result = await generateAmazonS3BucketObjectPresignedUrl(
      mockContext,
      'test-bucket-name',
      'test-object-key',
      300,
      'us-east-1'
    );
    expect(result).toMatch(
      /^https:\/\/test-bucket-name\.s3\.us-east-1\.amazonaws\.com\/test-object-key\?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=.+&X-Amz-Date=.+&X-Amz-Expires=300&X-Amz-Signature=.+&X-Amz-SignedHeaders=.+$/
    );
  });

  it('should generate a Amazon S3 bucket object presigned url with spaces in key for URI encoding', async () => {
    const result = await generateAmazonS3BucketObjectPresignedUrl(
      mockContext,
      'test-bucket-name',
      'test object key with spaces',
      300,
      'us-east-1'
    );
    expect(result).toMatch(
      /^https:\/\/test-bucket-name\.s3\.us-east-1\.amazonaws\.com\/test%20object%20key%20with%20spaces\?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=.+&X-Amz-Date=.+&X-Amz-Expires=300&X-Amz-Signature=.+&X-Amz-SignedHeaders=.+$/
    );
  });

  it('should downloadAmazonS3BucketObject file', async () => {
    mockClient.get.mockResolvedValueOnce({
      headers: responseDownloadBucketObjectHeaders,
      data: responseDownloadBucketObjectData,
    });
    const result = await downloadAmazonS3BucketObject(
      mockContext,
      'test-bucket-name',
      'test-object-key',
      'us-east-1'
    );
    expect(result).toEqual({
      bucket: 'test-bucket-name',
      key: 'test-object-key',
      contentType: 'application/octet-stream',
      contentLength: 12345,
      lastModified: 'ISO_Timestamp',
      etag: 'test-etag',
      content: responseDownloadBucketObjectDataBase64,
      encoding: 'base64',
      hasContent: true,
    });
    expect(mockClient.get).toBeCalledTimes(1);
  });

  it('should downloadAmazonS3BucketObject file with spaces in key for URI encoding', async () => {
    mockClient.get.mockResolvedValueOnce({
      headers: responseDownloadBucketObjectHeaders,
      data: responseDownloadBucketObjectData,
    });
    const result = await downloadAmazonS3BucketObject(
      mockContext,
      'test-bucket-name',
      'test object key with spaces',
      'us-east-1'
    );
    expect(result).toEqual({
      bucket: 'test-bucket-name',
      key: 'test object key with spaces',
      contentType: 'application/octet-stream',
      contentLength: 12345,
      lastModified: 'ISO_Timestamp',
      etag: 'test-etag',
      content: responseDownloadBucketObjectDataBase64,
      encoding: 'base64',
      hasContent: true,
    });
    expect(mockClient.get).toBeCalledTimes(1);
  });

  const responseListBucketsNoBuckets = '<ListAllMyBucketsResult></ListAllMyBucketsResult>';

  const responseListBucketsSingleBucket = `
  <ListAllMyBucketsResult>
   <Buckets>
      <Bucket>
         <BucketArn>test-bucket-arn</BucketArn>
         <BucketRegion>us-east-1</BucketRegion>
         <CreationDate>ISO_Timestamp</CreationDate>
         <Name>test-bucket-name</Name>
      </Bucket>
   </Buckets>
   <Owner>
      <DisplayName>owner display name</DisplayName>
      <ID>owner-id</ID>
   </Owner>
</ListAllMyBucketsResult>`;

  const responseListBucketsMultipleBuckets = `
  <ListAllMyBucketsResult>
   <Buckets>
      <Bucket>
         <BucketArn>test-bucket-arn</BucketArn>
         <BucketRegion>us-east-1</BucketRegion>
         <CreationDate>ISO_Timestamp</CreationDate>
         <Name>test-bucket-name</Name>
      </Bucket>
      <Bucket>
         <BucketArn>test-bucket-arn</BucketArn>
         <BucketRegion>us-east-1</BucketRegion>
         <CreationDate>ISO_Timestamp</CreationDate>
         <Name>second-bucket-name</Name>
      </Bucket>
   </Buckets>
   <Owner>
      <DisplayName>owner display name</DisplayName>
      <ID>owner-id</ID>
   </Owner>
   <NextContinuationToken>continuation-token</NextContinuationToken>
   <Prefix></Prefix>
</ListAllMyBucketsResult>`;

  const responseListBucketObjectsNoObjects =
    '<ListBucketResult><KeyCount>0</KeyCount></ListBucketResult>';

  const responseListBucketObjectsSingleObject = `
  <ListBucketResult>
    <IsTruncated>false</IsTruncated>
    <Contents>
      <Key>test-object-key</Key>
      <Size>12345</Size>
      <LastModified>ISO_Timestamp</LastModified>
      <ETag>test-etag</ETag>
      <StorageClass>STANDARD</StorageClass>
    </Contents>
    <KeyCount>1</KeyCount>
  </ListBucketResult>`;

  const responseListBucketObjectsMultipleObjects = `
  <ListBucketResult>
    <IsTruncated>true</IsTruncated>
    <NextContinuationToken>continuation-token</NextContinuationToken>
    <Contents>
      <Key>test-object-key</Key>
      <Size>12345</Size>
      <LastModified>ISO_Timestamp</LastModified>
      <ETag>test-etag</ETag>
      <StorageClass>STANDARD</StorageClass>
    </Contents>
    <Contents>
      <Key>second-object-key</Key>
      <Size>555222</Size>
      <LastModified>ISO_Timestamp</LastModified>
      <ETag>test-etag</ETag>
      <StorageClass>STANDARD</StorageClass>
    </Contents>
    <KeyCount>2</KeyCount>
  </ListBucketResult>`;

  const responseGetBucketObjectMetadata = {
    'accept-ranges': 'bytes',
    'content-length': '12345',
    'content-type': 'application/octet-stream',
    'last-modified': 'ISO_Timestamp',
    ETag: 'test-etag',
    'cache-control': 'no-cache',
    'content-disposition': 'attachment; filename="test-file-name"',
    'content-encoding': 'gzip',
    'content-language': 'en',
    'content-range': 'bytes 0-12344/12345',
    expires: 'Wed, 21 Oct 2025 07:28:00 GMT',
    server: 'AmazonS3',
    'x-amz-storage-class': 'STANDARD',
  };

  const responseDownloadBucketObjectHeaders = {
    'content-length': '12345',
    'content-type': 'application/octet-stream',
    'last-modified': 'ISO_Timestamp',
    ETag: 'test-etag',
    expires: 'Wed, 21 Oct 2025 07:28:00 GMT',
  };
  const responseDownloadBucketObjectData = Uint8Array.from([0x01, 0x10, 0x02, 0x20]);
  const responseDownloadBucketObjectDataBase64 = 'ARACIA==';
});
