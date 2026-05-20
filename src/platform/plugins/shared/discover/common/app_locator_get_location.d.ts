import type { GlobalQueryStateFromUrl } from '@kbn/data-plugin/public';
import type { setStateToKbnUrl as setStateToKbnUrlCommon } from '@kbn/kibana-utils-plugin/common';
import type { DiscoverAppLocatorGetLocation, DiscoverAppLocatorParams, MainHistoryLocationState } from './app_locator';
import type { DiscoverAppState } from '../public';
export declare const appLocatorGetLocationCommon: ({ useHash: useHashOriginal, setStateToKbnUrl, }: {
    useHash: boolean;
    setStateToKbnUrl: typeof setStateToKbnUrlCommon;
}, ...[params]: Parameters<DiscoverAppLocatorGetLocation>) => ReturnType<DiscoverAppLocatorGetLocation>;
export declare const parseAppLocatorParams: (params: DiscoverAppLocatorParams) => {
    appState: Partial<DiscoverAppState>;
    globalState: GlobalQueryStateFromUrl;
    state: MainHistoryLocationState;
};
