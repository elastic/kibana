import type { IRouter } from '@kbn/core-http-server';
import type { FileHashCache } from './file_hash_cache';
export declare function registerRouteForBundle(router: IRouter, { publicPath, routePath, bundlesPath, fileHashCache, isDist, }: {
    publicPath: string;
    routePath: string;
    bundlesPath: string;
    fileHashCache: FileHashCache;
    isDist: boolean;
}): void;
