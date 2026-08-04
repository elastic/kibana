import type { GlobalQueryStateFromUrl } from '@kbn/data-plugin/public';
import type { setStateToKbnUrl as setStateToKbnUrlCommon } from '@kbn/kibana-utils-plugin/common';
import type { DiscoverAppLocatorGetLocation, DiscoverAppLocatorParams, MainHistoryLocationState } from './app_locator';
import type { DiscoverAppState } from '../public';
import { type ProfileStateRegistry } from './context_awareness';
export declare const appLocatorGetLocationCommon: ({ useHash: useHashOriginal, setStateToKbnUrl, profileStateRegistry, }: {
    useHash: boolean;
    setStateToKbnUrl: typeof setStateToKbnUrlCommon;
    profileStateRegistry: ProfileStateRegistry;
}, ...[params]: Parameters<DiscoverAppLocatorGetLocation>) => ReturnType<DiscoverAppLocatorGetLocation>;
export declare const parseAppLocatorParams: (params: DiscoverAppLocatorParams, profileStateRegistry: ProfileStateRegistry) => {
    appState: Partial<DiscoverAppState>;
    globalState: GlobalQueryStateFromUrl;
    profileUrlState: import("./context_awareness").ProfileStateMap;
    state: MainHistoryLocationState;
};
