import type { RequestHandler } from '@kbn/core-http-server';
import type { IFileHashCache } from './file_hash_cache';
/**
 *  Serve asset for the requested path. This is designed
 *  to replicate a subset of the features provided by Hapi's Inert
 *  plugin including:
 *   - ensure path is not traversing out of the bundle directory
 *   - manage use file descriptors for file access to efficiently
 *     interact with the file multiple times in each request
 *   - generate and cache etag for the file
 *   - write correct headers to response for client-side caching
 *     and invalidation
 *   - stream file to response
 *
 *  It differs from Inert in some important ways:
 *   - cached hash/etag is based on the file on disk, but modified
 *     by the public path so that individual public paths have
 *     different etags, but can share a cache
 */
export declare const createDynamicAssetHandler: ({ bundlesPath, fileHashCache, isDist, publicPath, }: {
    bundlesPath: string;
    publicPath: string;
    fileHashCache: IFileHashCache;
    isDist: boolean;
}) => RequestHandler<{
    path: string;
}, {}, {}>;
