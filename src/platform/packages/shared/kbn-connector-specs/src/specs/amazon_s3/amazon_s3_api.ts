/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from 'xml2js';
import type { ActionContext } from '../../connector_spec';
import { calculateAWSA4Signature, sha256Hash } from '../../auth_types/aws_crypto_helpers';
import type {
  AmazonS3BucketObjectListing,
  AmazonS3Bucket,
  AmazonS3BucketsListing,
  AmazonS3ObjectMetadata,
  AmazonS3Object,
} from './amazon_s3_types';

function createQueryString(params: Record<string, string | undefined>): string {
  const queryParams: Record<string, string> = {};
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        queryParams[key] = value;
      }
    }
  }

  const sortedParams = Object.keys(queryParams).sort();
  return sortedParams
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
    .join('&');
}

function createAwsS3Error(error: unknown): Error {
  const awsError = error as {
    name?: string;
    message?: string;
    $metadata?: { httpStatusCode?: number };
  };
  if (awsError.name && awsError.message) {
    return new Error(`AWS S3 error (${awsError.name}): ${awsError.message}`);
  } else if (awsError.message) {
    return new Error(`AWS S3 error: ${awsError.message}`);
  } else {
    return new Error(`Unknown AWS S3 error: ${JSON.stringify(error)}`);
  }
}

function getJsObjectOrValue(
  value: unknown,
  collectionItems: Record<string, string | undefined>
): unknown {
  if (typeof value === 'object' && value !== null) {
    return jsObjectToRecord(value as Record<string, unknown>, collectionItems);
  }
  return value;
}

function extractCollectionValues(
  values: unknown,
  itemKey: string | undefined,
  collectionItems: Record<string, string | undefined>
): unknown[] {
  let itemsArray: unknown[] = [];

  if (Array.isArray(values)) {
    if (!itemKey) {
      itemsArray = values.map((value) => getJsObjectOrValue(value, collectionItems));
    } else {
      values.forEach((value) => {
        const itemValue = (value as Record<string, unknown>)[itemKey];
        if (itemValue) {
          itemsArray.push(getJsObjectOrValue(itemValue, collectionItems));
        }
      });
    }
  } else if (typeof values === 'object' && values !== null) {
    const itemValue = itemKey ? (values as Record<string, unknown>)[itemKey] : values;
    if (itemValue) {
      if (Array.isArray(itemValue)) {
        itemValue.forEach((value) => {
          itemsArray.push(getJsObjectOrValue(value, collectionItems));
        });
      } else {
        itemsArray.push(getJsObjectOrValue(itemValue, collectionItems));
      }
    }
  }

  return itemsArray;
}

function jsObjectToRecord(
  obj: Record<string, unknown>,
  collectionItems: Record<string, string | undefined>
): Record<string, unknown> {
  const returnData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      returnData[key] = value.map((arrayItem) => getJsObjectOrValue(arrayItem, collectionItems));
    } else if (Object.prototype.hasOwnProperty.call(collectionItems, key)) {
      returnData[key] = extractCollectionValues(value, collectionItems[key], collectionItems);
    } else {
      returnData[key] = getJsObjectOrValue(value, collectionItems);
    }
  }
  return returnData;
}

// This function parses a response from AWS in XML and returns a Record set of the found object
// The collectionItems parameter is used to specify if there are any nested collections in the XML that should be returned as an array of items instead of a single object.
// The key of the collectionItems object is the name of the collection in the XML, and the value is the name of the item within that collection.
async function parseAwsXmlResponse(
  xml: string,
  collectionItems?: Record<string, string | undefined>
): Promise<Record<string, unknown>> {
  const parser = new Parser({ explicitArray: false, explicitRoot: false, ignoreAttrs: true });
  const parsed = await parser.parseStringPromise(xml);
  return jsObjectToRecord(parsed, collectionItems || {});
}

function urlEncodeS3ObjectKey(objectKey: string): string {
  return objectKey
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function getAwsS3EndpointForBucketObject(
  region: string,
  bucketName: string,
  objectKey: string
): string {
  // Ensure each segment of the key is encoded, but slashes are preserved
  const encodedObjectKey = urlEncodeS3ObjectKey(objectKey);
  return `https://${bucketName}.s3.${region}.amazonaws.com/${encodedObjectKey}`;
}

export async function listAmazonS3Buckets(
  ctx: ActionContext,
  bucketsRegion?: string,
  prefix?: string,
  maxBuckets?: number,
  continuationToken?: string
): Promise<AmazonS3BucketsListing> {
  const region = (ctx.config as { region: string }).region;
  const awsS3Host = `s3.${region}.amazonaws.com`;

  const queryString = createQueryString({
    'bucket-region': bucketsRegion,
    'continuation-token': continuationToken,
    'max-buckets': maxBuckets?.toString(),
    prefix,
  });

  const url = `https://${awsS3Host}/${queryString ? `?${queryString}` : ''}`;

  try {
    const rawResponse = await ctx.client.get(url);
    const response = (await parseAwsXmlResponse(rawResponse.data, { Buckets: 'Bucket' })) as Record<
      string,
      unknown
    >;

    const buckets: AmazonS3Bucket[] = [];
    if (response.Buckets) {
      for (const bucket of response.Buckets as Array<Record<string, unknown>>) {
        buckets.push({
          name: bucket.Name as string,
          creationDate: bucket.CreationDate as string,
        });
      }
    }

    return {
      buckets,
      nextContinuationToken: (response.NextContinuationToken as string) || undefined,
      isTruncated: response.IsTruncated ? /true/i.test(response.IsTruncated as string) : false,
    };
  } catch (error: unknown) {
    throw createAwsS3Error(error);
  }
}

export async function listAmazonS3BucketObjects(
  ctx: ActionContext,
  bucketName: string,
  bucketRegion?: string,
  prefix?: string,
  maxKeys?: number,
  continuationToken?: string
): Promise<AmazonS3BucketObjectListing> {
  const region = bucketRegion || (ctx.config as { region: string }).region;
  const awsS3Host = `${bucketName}.s3.${region}.amazonaws.com`;

  const queryString = createQueryString({
    'list-type': '2',
    'continuation-token': continuationToken,
    'max-keys': maxKeys?.toString(),
    prefix,
  });

  const url = `https://${awsS3Host}/${queryString ? `?${queryString}` : ''}`;

  try {
    const rawResponse = await ctx.client.get(url);
    const response = (await parseAwsXmlResponse(rawResponse.data, {
      Contents: undefined,
    })) as Record<string, unknown>;

    return {
      bucket: bucketName,
      objectCount: parseInt((response.KeyCount as string) || '0', 10),
      objects: ((response.Contents as Array<Record<string, unknown>>) || []).map((item) => ({
        key: item.Key as string,
        size: parseInt((item.Size as string) || '0', 10),
        lastModified: item.LastModified as string,
        storageClass: item.StorageClass as string,
      })),
      nextContinuationToken: (response.NextContinuationToken as string) || undefined,
      isTruncated: response.IsTruncated ? /true/i.test(response.IsTruncated as string) : false,
    };
  } catch (error: unknown) {
    throw createAwsS3Error(error);
  }
}

export async function getAmazonS3BucketObjectMetadata(
  ctx: ActionContext,
  bucketName: string,
  objectKey: string,
  bucketRegion?: string
): Promise<AmazonS3ObjectMetadata> {
  const region = bucketRegion || (ctx.config as { region: string }).region;
  const objectUrl = getAwsS3EndpointForBucketObject(region, bucketName, objectKey);

  try {
    const rawResponse = await ctx.client.head(objectUrl);

    return {
      acceptRanges: rawResponse.headers['accept-ranges'],
      bucket: bucketName,
      cacheControl: rawResponse.headers['cache-control'] as string,
      contentDisposition: rawResponse.headers['content-disposition'],
      contentEncoding: rawResponse.headers['content-encoding'] as string,
      contentLanguage: rawResponse.headers['content-language'],
      contentLength: parseInt((rawResponse.headers['content-length'] as string) || '0', 10),
      contentRange: rawResponse.headers['content-range'],
      contentType: rawResponse.headers['content-type'] as string,
      eTag: rawResponse.headers.ETag || rawResponse.headers.etag,
      expires: rawResponse.headers.expires,
      key: objectKey,
      lastModified: rawResponse.headers['last-modified'],
      region,
      server: rawResponse.headers.server as string,
      storageClass: rawResponse.headers['x-amz-storage-class'],
    };
  } catch (error: unknown) {
    throw createAwsS3Error(error);
  }
}

export async function generateAmazonS3BucketObjectPresignedUrl(
  ctx: ActionContext,
  bucketName: string,
  objectKey: string,
  expiresInSeconds: number = 300,
  bucketRegion?: string
): Promise<string> {
  const region = bucketRegion || (ctx.config as { region: string }).region;
  const awsS3Host = `${bucketName}.s3.${region}.amazonaws.com`;

  const amzDateTime = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const amzDateOnly = amzDateTime.substring(0, 8);

  const accessKey = (ctx.secrets as { accessKeyId: string; secretAccessKey: string }).accessKeyId;
  const secretKey = (ctx.secrets as { accessKeyId: string; secretAccessKey: string })
    .secretAccessKey;
  const dateRegionService = `${amzDateOnly}/${region}/s3/aws4_request`;
  const credentialValue = `${accessKey}/${dateRegionService}`;

  // our headers we need to set
  const headersList: Record<string, string> = {
    host: awsS3Host,
  };
  const canonicalHeaders = Object.keys(headersList)
    .sort()
    .map((key) => `${key.toLowerCase()}:${headersList[key]}`)
    .join('\n');
  const signedHeadersString = Object.keys(headersList)
    .map((key) => key.toLowerCase())
    .sort()
    .join(';');

  // our query string values that are needed
  const queryStringValues: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credentialValue,
    'X-Amz-Date': amzDateTime,
    'X-Amz-Expires': expiresInSeconds.toString(),
    'X-Amz-SignedHeaders': signedHeadersString,
  };
  const queryString = createQueryString(queryStringValues);

  // and create the actual request
  const canonicalUri = `/${urlEncodeS3ObjectKey(objectKey)}`;
  const canonicalRequest = `GET\n${canonicalUri}\n${queryString}\n${canonicalHeaders}\n\n${signedHeadersString}\nUNSIGNED-PAYLOAD`;

  // assemble the string to sign
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDateTime}\n${dateRegionService}\n${await sha256Hash(
    canonicalRequest
  )}`;

  // and add in the signature and return the full URL
  const signature = await calculateAWSA4Signature(
    secretKey,
    amzDateOnly,
    region,
    's3',
    stringToSign
  );
  queryStringValues['X-Amz-Signature'] = signature;

  return `https://${awsS3Host}${canonicalUri}?${createQueryString(queryStringValues)}`;
}

export async function downloadAmazonS3BucketObject(
  ctx: ActionContext,
  bucketName: string,
  objectKey: string,
  bucketRegion?: string
): Promise<AmazonS3Object> {
  const region = bucketRegion || (ctx.config as { region: string }).region;
  const objectUrl = getAwsS3EndpointForBucketObject(region, bucketName, objectKey);

  try {
    const response = await ctx.client.get(objectUrl, { responseType: 'arraybuffer' });

    const base64Content = response.data ? Buffer.from(response.data).toString('base64') : undefined;

    return {
      bucket: bucketName,
      key: objectKey,
      contentType: (response.headers['content-type'] as string) || 'application/octet-stream',
      contentLength: parseInt((response.headers['content-length'] as string) || '0', 10),
      lastModified: response.headers['last-modified'],
      etag: response.headers.ETag || response.headers.etag,
      hasContent: true,
      content: base64Content,
      encoding: 'base64',
    };
  } catch (error: unknown) {
    throw createAwsS3Error(error);
  }
}
