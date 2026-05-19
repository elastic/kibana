export interface AmazonS3Bucket {
    name?: string;
    creationDate?: string;
}
export interface AmazonS3BucketsListing {
    buckets: AmazonS3Bucket[];
    nextContinuationToken?: string;
    isTruncated: boolean;
}
export interface AmazonS3BucketObjectItem {
    key: string;
    size: number;
    lastModified: string;
    storageClass: string;
}
export interface AmazonS3BucketObjectListing {
    bucket: string;
    objectCount: number;
    objects: AmazonS3BucketObjectItem[];
    nextContinuationToken?: string;
    isTruncated: boolean;
}
export interface AmazonS3ObjectMetadata {
    acceptRanges: string;
    bucket: string;
    cacheControl: string;
    contentDisposition: string;
    contentEncoding: string;
    contentLanguage: string;
    contentLength: number;
    contentRange: string;
    contentType: string;
    eTag: string;
    expires: string;
    key: string;
    lastModified: string;
    region: string;
    server: string;
    storageClass: string;
}
export interface AmazonS3Object {
    bucket: string;
    key: string;
    contentType: string;
    contentLength: number;
    lastModified: string;
    etag: string;
    hasContent: boolean;
    content?: string;
    encoding: string;
    contentUrl?: string;
    message?: string;
}
export interface ActionListBucketsInput {
    region?: string;
    prefix?: string;
}
export interface ActionListBucketObjectsInput {
    bucket: string;
    region?: string;
    prefix?: string;
    continuationToken?: string;
    maxKeys?: number;
}
export interface ActionDownloadFileInput {
    bucket: string;
    key: string;
    maximumDownloadSizeBytes?: number;
}
