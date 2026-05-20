import type { Observable } from 'rxjs';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import type { SearchAbortController } from './search_abort_controller';
interface ResponseCacheItem {
    response$: Observable<IKibanaSearchResponse>;
    searchAbortController: SearchAbortController;
}
export declare class SearchResponseCache {
    private maxItems;
    private maxCacheSizeMB;
    private responseCache;
    private cacheSize;
    constructor(maxItems: number, maxCacheSizeMB: number);
    private byteToMb;
    private deleteItem;
    private setItem;
    clear(): void;
    private shrink;
    has(key: string): boolean;
    /**
     *
     * @param key key to cache
     * @param response$
     * @returns A ReplaySubject that mimics the behavior of the original observable
     * @throws error if key already exists
     */
    set(key: string, item: ResponseCacheItem): void;
    get(key: string): ResponseCacheItem | undefined;
}
export {};
