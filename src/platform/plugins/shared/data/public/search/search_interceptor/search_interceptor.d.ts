import type { Observable } from 'rxjs';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { CoreStart, ExecutionContextSetup, IUiSettingsClient, ToastsSetup } from '@kbn/core/public';
import type { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/search-types';
import type { ICPSManager } from '@kbn/cps-utils';
import type { IAsyncSearchOptions } from '../../../common';
import type { SearchUsageCollector } from '../collectors';
import type { ISessionService } from '../session';
import type { SearchConfigSchema } from '../../../server/config';
export interface SearchInterceptorDeps {
    http: HttpSetup;
    executionContext: ExecutionContextSetup;
    uiSettings: IUiSettingsClient;
    startServices: Promise<[CoreStart, object, unknown]>;
    toasts: ToastsSetup;
    usageCollector?: SearchUsageCollector;
    session: ISessionService;
    searchConfig: SearchConfigSchema;
    getCPSManager?: () => ICPSManager | undefined;
}
export declare class SearchInterceptor {
    private readonly deps;
    private uiSettingsSubs;
    private searchTimeout;
    private readonly responseCache;
    private protocolSupportsMultiplexing;
    private performanceObserver?;
    /**
     * Observable that emits when the number of pending requests changes.
     * @internal
     */
    private pendingCount$;
    /**
     * @internal
     */
    private application;
    private docLinks;
    private inspector;
    private startRenderServices;
    constructor(deps: SearchInterceptorDeps);
    stop(): void;
    private getTimeoutMode;
    private createRequestHash$;
    private handleSearchError;
    private getSerializableOptions;
    /**
     * @internal
     * Creates a new pollSearch that share replays its results
     */
    private runSearch$;
    /**
     * @internal
     * @throws `AbortError` | `ErrorLike`
     */
    private runSearch;
    /**
     * @internal
     * Creates a new search observable and a corresponding search abort controller
     * If requestHash is defined, tries to return them first from cache.
     */
    private getSearchResponse$;
    /**
     * Searches using the given `search` method. Overrides the `AbortSignal` with one that will abort
     * either when the request times out, or when the original `AbortSignal` is aborted. Updates
     * `pendingCount$` when the request is started/finalized.
     *
     * @param request
     * @options
     * @returns `Observable` emitting the search response or an error.
     */
    search({ id, ...request }: IKibanaSearchRequest, options?: IAsyncSearchOptions): Observable<IKibanaSearchResponse<any>>;
    private showTimeoutErrorToast;
    private showTimeoutErrorMemoized;
    private showRestoreWarningToast;
    private showRestoreWarning;
    /**
     * Show one error notification per session.
     * @internal
     */
    private showTimeoutError;
    showError(e: Error): void;
}
export type ISearchInterceptor = PublicMethodsOf<SearchInterceptor>;
