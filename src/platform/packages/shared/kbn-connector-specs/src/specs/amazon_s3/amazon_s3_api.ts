/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ActionContext } from "../../connector_spec";
import { Parser } from 'xml2js';

type AmazonS3Bucket = {
    name?: string;
    creationDate?: string;
}

type AmazonS3BucketsListing = {
    buckets: AmazonS3Bucket[],
    nextContinuationToken?: string,
    isTruncated: boolean,
}

type AmazonS3BucketObjectItem = {
    key: string,
    size: number,
    lastModified: string,
    storageClass: string,
}

type AmazonS3BucketObjectListing = {
    bucket: string,
    objectCount: number,
    objects: AmazonS3BucketObjectItem[],
    nextContinuationToken?: string,
    isTruncated: boolean,
}

type AmazonS3ObjectMetadata = {
    acceptRanges: string,
    bucket: string,
    cacheControl: string,
    contentDisposition: string,
    contentEncoding: string,
    contentLanguage: string,
    contentLength: number,
    contentRange: string,
    contentType: string,
    eTag: string,
    expires: string,
    key: string,
    lastModified: string,
    region: string,
    server: string,
    storageClass: string,
}

type AmazonS3Object = {
    bucket: string,
    key: string,
    contentType: string,
    contentLength: number,
    lastModified: string,
    etag: string,
    content?: string,
    encoding: string,
    contentUrl?: string,
    message?: string,
}

function createQueryQueryString(params: Record<string, string | undefined>): string {
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

function getJsObjectOrValue(value: any, collectionItems: Record<string, string | undefined>): any {
    if (typeof value === 'object' && value !== null) {
        return jsObjectToRecord(value, collectionItems);
    }
    return value;
}

function extractCollectionValues(values: any, itemKey: string | undefined, collectionItems: Record<string, string | undefined>): any[] {
    let itemsArray: any[] = [];

    if (Array.isArray(values)) {
        if (!itemKey) {
            itemsArray = values.map((value) => getJsObjectOrValue(value, collectionItems));
        } else {
            values.forEach((value) => {
                const itemValue = value[itemKey];
                if (itemValue) {
                    itemsArray.push(getJsObjectOrValue(itemValue, collectionItems));
                }
            });            
        }
    } else if (typeof values === 'object' && values !== null) {
        const itemValue = itemKey ? values[itemKey] : values;
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

function jsObjectToRecord(obj: any, collectionItems: Record<string, string | undefined>): Record<string, unknown> {
   let returnData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (Array.isArray(value)) {
            returnData[key] = value.map((arrayItem) => getJsObjectOrValue(arrayItem, collectionItems));
        } else if (collectionItems.hasOwnProperty(key)) {
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
function parseAwsXmlResponse(xml: string, collectionItems?: Record<string, string | undefined>) : Record<string, unknown> {
    const parser = new Parser({ explicitArray: false, explicitRoot: false, ignoreAttrs: true });
    
    let returnValue: Record<string, unknown> = {};

    parser.parseString(xml, (err, result) => {
        if (err) {
            throw new Error(`Failed to parse AWS XML response: ${err.message}`);
        }
        
        returnValue = jsObjectToRecord(result, collectionItems || {}); 
    });

    return returnValue;
}

export async function listAmazonS3Buckets(ctx: ActionContext, bucketsRegion?: string, prefix?: string, maxBuckets?: number, continuationToken?: string) : Promise<AmazonS3BucketsListing> {
    const region = (ctx.config as { region: string }).region;
    const awsS3Host = `s3.${region}.amazonaws.com`;

    const queryString = createQueryQueryString({
        'bucket-region': bucketsRegion,
        'continuation-token': continuationToken,
        'max-buckets': maxBuckets?.toString(),
        'prefix': prefix,
    });

    const url = `https://${awsS3Host}/${queryString ? `?${queryString}` : ''}`;

    try {
        const rawResponse = await ctx.client.get(url);
        const response = parseAwsXmlResponse(rawResponse.data, {'Buckets': 'Bucket'}) as Record<string, unknown>;

        let buckets: AmazonS3Bucket[] = [];
        if (response["Buckets"]) {
            for (const bucket of response["Buckets"] as any[]) {
                buckets.push({
                    name: bucket.Name as string,
                    creationDate: bucket.CreationDate as string
                });
            }
        }

        return {
            buckets: buckets,
            nextContinuationToken: response.ContinuationToken as string || undefined,
            isTruncated: response.IsTruncated ? (/true/i).test(response.IsTruncated as string) : false,
        }
    } catch (error: unknown) {
        throwS3Error(error);
    }

    return {} as AmazonS3BucketsListing;
}


export async function listAmazonS3BucketObjects(ctx: ActionContext, bucketName: string, bucketRegion?: string, prefix?: string, maxKeys?: number, continuationToken?: string) : Promise<AmazonS3BucketObjectListing> {
    const region = bucketRegion || (ctx.config as { region: string }).region;
    const awsS3Host = `${bucketName}.s3.${region}.amazonaws.com`;

    const queryString = createQueryQueryString({
        'list-type': '2',
        'continuation-token': continuationToken,
        'max-keys': maxKeys?.toString(),
        'prefix': prefix,
    });

    const url = `https://${awsS3Host}/${queryString ? `?${queryString}` : ''}`;

    try {
        const rawResponse = await ctx.client.get(url);
        const response = parseAwsXmlResponse(rawResponse.data, {'Contents': undefined}) as Record<string, unknown>;

        return {
            bucket: bucketName,
            objectCount: parseInt(response.KeyCount as string || '0', 10),
            objects: (response.Contents as any[] || []).map((item) => ({
                key: item.Key as string,
                size: parseInt(item.Size as string || '0', 10),
                lastModified: item.LastModified as string,
                storageClass: item.StorageClass as string,
            })),
            nextContinuationToken: response.ContinuationToken as string || undefined,
            isTruncated: response.IsTruncated ? (/true/i).test(response.IsTruncated as string) : false,
        }
    } catch (error: unknown) {
        throwS3Error(error);
    }

    return {} as AmazonS3BucketObjectListing;    
}

export async function getAmazonS3BucketObjectMetadata(ctx: ActionContext, bucketName: string, objectKey: string, bucketRegion?: string) : Promise<AmazonS3ObjectMetadata> {
    const region = bucketRegion || (ctx.config as { region: string }).region;
    const awsS3Host = `${bucketName}.s3.${region}.amazonaws.com`;
    const url = `https://${awsS3Host}/${objectKey}`;
    try {
        const rawResponse = await ctx.client.head(url);

        return {
            acceptRanges: rawResponse.headers['accept-ranges'],
            bucket: bucketName,
            cacheControl: rawResponse.headers['cache-control'],
            contentDisposition: rawResponse.headers['content-disposition'],
            contentEncoding: rawResponse.headers['content-encoding'],
            contentLanguage: rawResponse.headers['content-language'],
            contentLength: parseInt(rawResponse.headers['content-length'] || '0', 10),
            contentRange: rawResponse.headers['content-range'],
            contentType: rawResponse.headers['content-type'],
            eTag: rawResponse.headers['ETag'] || rawResponse.headers['etag'],
            expires: rawResponse.headers['expires'],
            key: objectKey,
            lastModified: rawResponse.headers['last-modified'],
            region: region,
            server: rawResponse.headers['server'],
            storageClass: rawResponse.headers['x-amz-storage-class'],
        };
    } catch (error: unknown) {
        throwS3Error(error);
    }
    return {} as AmazonS3ObjectMetadata;
}

export async function generateAmazonS3BucketObjectPresignedUrl(ctx: ActionContext, bucketName: string, objectKey: string, expiresInSeconds: number = 300, bucketRegion?: string) : Promise<string> {
    // const accessKeyId = (ctx.config as { accessKeyId: string }).accessKeyId;
    const region = bucketRegion || (ctx.config as { region: string }).region;
    const awsS3Host = `${bucketName}.s3.${region}.amazonaws.com`;
    const objectUrl = `https://${awsS3Host}/${objectKey}`;

    // TODO -- generating a presigned URL is non-trivial as it requires signing the request with AWS SigV4.
    // for now, just return the objectURL
    return objectUrl;

    /*
    const amzDateTime = (new Date()).toISOString().replace(/[:-]|\.\d{3}/g, '');
    const amzDateOnly = amzDateTime.substring(0, 8);
    const credentialValue = `${accessKeyId}/${amzDateOnly}/${region}/s3/aws4_request`;

    try {
        const response = await ctx.client.get(objectUrl, { maxBodyLength: 0});
        
        const signature = "test";

        const queryString = createQueryQueryString({
            'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
            'X-Amz-Credential': credentialValue,
            'X-Amz-Date': amzDateTime,
            'X-Amz-Expires': expiresInSeconds.toString(),
            'X-Amz-SignedHeaders': 'host',
            'X-Amz-Signature': signature,
        });

        return `https://s3.amazonaws.com/${objectKey}?${queryString}`;
    } catch (error: unknown) {
        throwS3Error(error);
        throw error;
    }
    */
}


export async function downloadAmazonS3BucketObject(ctx: ActionContext, bucketName: string, objectKey: string, bucketRegion?: string) : Promise<AmazonS3Object> {
    const region = bucketRegion || (ctx.config as { region: string }).region;
    const awsS3Host = `${bucketName}.s3.${region}.amazonaws.com`;
    const objectUrl = `https://${awsS3Host}/${objectKey}`;

    try {
        const response = await ctx.client.get(objectUrl, { responseType: 'arraybuffer' });

        const base64Content = response.data
            ? Buffer.from(response.data).toString('base64')
            : undefined;

        return {
            bucket: bucketName,
            key: objectKey,
            contentType: response.headers['content-type'] || 'application/octet-stream',
            contentLength: parseInt(response.headers['content-length'] || '0', 10),
            lastModified: response.headers['last-modified'],
            etag: response.headers['ETag'] || response.headers['etag'],
            content: base64Content,
            encoding: 'base64',
        };
    } catch (error: unknown) {
        throwS3Error(error);
    }
    return {} as AmazonS3Object;
}
