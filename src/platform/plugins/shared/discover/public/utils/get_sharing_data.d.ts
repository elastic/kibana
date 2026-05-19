import type { Capabilities } from '@kbn/core/public';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { DataPublicPluginStart, ISearchSource, SerializedSearchSourceFields } from '@kbn/data-plugin/public';
import type { DiscoverAppState } from '../application/main/state_management/redux';
/**
 * Preparing data to share the current state as link or CSV/Report
 */
export declare function getSharingData(currentSearchSource: ISearchSource, state: DiscoverAppState, services: {
    uiSettings: IUiSettingsClient;
    data: DataPublicPluginStart;
}, isEsqlMode?: boolean): Promise<{
    getSearchSource: ({ addGlobalTimeFilter, absoluteTime, }: {
        addGlobalTimeFilter?: boolean;
        absoluteTime?: boolean;
    }) => SerializedSearchSourceFields;
    columns: string[];
}>;
export interface DiscoverCapabilities {
    createShortUrl?: boolean;
    save?: boolean;
    show?: boolean;
    storeSearchSession?: boolean;
}
export declare const showPublicUrlSwitch: (anonymousUserCapabilities: Capabilities) => boolean;
