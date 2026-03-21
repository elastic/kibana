import type { CoreSetup, Logger } from '@kbn/core/server';
import type { ISearchOptions, IEsSearchResponse } from '@kbn/search-types';
export interface SearchUsage {
    trackError(): Promise<void>;
    trackSuccess(duration: number): Promise<void>;
}
export declare function usageProvider(core: CoreSetup): SearchUsage;
/**
 * Rxjs observer for easily doing `tap(searchUsageObserver(logger, usage))` in an rxjs chain.
 */
export declare function searchUsageObserver(logger: Logger, usage?: SearchUsage, { isRestore }?: ISearchOptions): {
    next(response: IEsSearchResponse): void;
    error(e: Error): void;
};
