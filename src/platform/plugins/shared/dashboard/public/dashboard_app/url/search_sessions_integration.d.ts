import type { SearchSessionInfoProvider } from '@kbn/data-plugin/public';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { History } from 'history';
import type { DashboardLocatorParams } from '../../../common/types';
import type { DashboardApi, DashboardInternalApi } from '../../dashboard_api/types';
export declare const removeSearchSessionIdFromURL: (kbnUrlStateStorage: IKbnUrlStateStorage) => void;
export declare const getSearchSessionIdFromURL: (history: History) => string | undefined;
export declare const getSessionURLObservable: (history: History) => import("rxjs").Observable<string | undefined>;
export declare function createSessionRestorationDataProvider(dashboardApi: DashboardApi, dashboardInternalApi: DashboardInternalApi): SearchSessionInfoProvider<DashboardLocatorParams>;
