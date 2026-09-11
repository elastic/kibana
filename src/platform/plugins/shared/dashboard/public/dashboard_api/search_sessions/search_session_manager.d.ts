import type { BehaviorSubject } from 'rxjs';
import type { EmbeddablePackageState } from '@kbn/embeddable-plugin/public';
import type { DashboardApi, DashboardCreationOptions, DashboardInternalApi } from '../types';
export declare function initializeSearchSessionManager(searchSessionSettings: DashboardCreationOptions['searchSessionSettings'], incomingEmbeddables: EmbeddablePackageState[] | undefined, dashboardApi: Omit<DashboardApi, 'searchSessionId$'>, dashboardInternalApi: DashboardInternalApi): {
    api: {
        searchSessionId$: BehaviorSubject<string | undefined>;
        requestSearchSessionId: (() => Promise<string | undefined>) | undefined;
    };
    cleanup: () => void;
};
