import type { ActionContext } from '../../connector_spec';
import type { AmazonS3BucketObjectListing, AmazonS3BucketsListing, AmazonS3ObjectMetadata, AmazonS3Object } from './amazon_s3_types';
export declare function listAmazonS3Buckets(ctx: ActionContext, bucketsRegion?: string, prefix?: string, maxBuckets?: number, continuationToken?: string): Promise<AmazonS3BucketsListing>;
export declare function listAmazonS3BucketObjects(ctx: ActionContext, bucketName: string, bucketRegion?: string, prefix?: string, maxKeys?: number, continuationToken?: string): Promise<AmazonS3BucketObjectListing>;
export declare function getAmazonS3BucketObjectMetadata(ctx: ActionContext, bucketName: string, objectKey: string, bucketRegion?: string): Promise<AmazonS3ObjectMetadata>;
export declare function generateAmazonS3BucketObjectPresignedUrl(ctx: ActionContext, bucketName: string, objectKey: string, expiresInSeconds?: number, bucketRegion?: string): Promise<string>;
export declare function downloadAmazonS3BucketObject(ctx: ActionContext, bucketName: string, objectKey: string, bucketRegion?: string): Promise<AmazonS3Object>;
