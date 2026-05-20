import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { History } from 'history';
import type { DashboardState } from '../../../common/types';
import type { DashboardApi } from '../../dashboard_api/types';
/**
 * Loads any dashboard state from the URL, and removes the state from the URL.
 */
export declare const loadAndRemoveDashboardState: (kbnUrlStateStorage: IKbnUrlStateStorage) => Partial<DashboardState>;
export declare const startSyncingExpandedPanelState: ({ dashboardApi, history, }: {
    dashboardApi: DashboardApi;
    history: History;
}) => {
    stopWatchingExpandedPanel: () => void;
};
