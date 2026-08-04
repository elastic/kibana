import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { DashboardMountContextProps } from './types';
import type { DashboardApi } from '../dashboard_api/types';
export declare const dashboardUrlParams: {
    showTopMenu: string;
    showQueryInput: string;
    showTimeFilter: string;
    hideFilterBar: string;
};
export interface DashboardMountProps {
    appUnMounted: () => void;
    element: AppMountParameters['element'];
    coreStart: CoreStart;
    mountContext: DashboardMountContextProps;
    setDashboardAppApi: (api: DashboardApi | undefined) => void;
}
export declare function mountApp({ coreStart, element, appUnMounted, mountContext, setDashboardAppApi, }: DashboardMountProps): Promise<() => void>;
