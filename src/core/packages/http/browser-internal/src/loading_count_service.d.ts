import type { Observable } from 'rxjs';
import type { CoreService } from '@kbn/core-base-browser-internal';
import type { FatalErrorsSetup } from '@kbn/core-fatal-errors-browser';
/** @public */
export interface LoadingCountSetup {
    addLoadingCountSource(countSource$: Observable<number>): void;
    getLoadingCount$(): Observable<number>;
}
/**
 * See {@link LoadingCountSetup}.
 * @public
 */
export type LoadingCountStart = LoadingCountSetup;
/** @internal */
export declare class LoadingCountService implements CoreService<LoadingCountSetup, LoadingCountStart> {
    private readonly stop$;
    private readonly loadingCount$;
    setup({ fatalErrors }: {
        fatalErrors: FatalErrorsSetup;
    }): {
        getLoadingCount$: () => Observable<number>;
        addLoadingCountSource: (count$: Observable<number>) => void;
    };
    start({ fatalErrors }: {
        fatalErrors: FatalErrorsSetup;
    }): {
        getLoadingCount$: () => Observable<number>;
        addLoadingCountSource: (count$: Observable<number>) => void;
    };
    stop(): void;
}
