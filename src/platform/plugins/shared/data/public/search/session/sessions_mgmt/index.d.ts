import type { CoreStart, HttpStart, I18nStart, IUiSettingsClient } from '@kbn/core/public';
import type { CoreSetup } from '@kbn/core/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { ISessionsClient, SearchUsageCollector } from '../../..';
import type { SearchSessionsMgmtAPI } from './lib/api';
import type { SearchSessionsConfigSchema } from '../../../../server/config';
import type { ISearchSessionEBTManager } from '../ebt_manager';
export { openSearchSessionsFlyout } from './flyout/get_flyout';
export type { BackgroundSearchOpenedHandler } from './types';
export interface IManagementSectionsPluginsSetup {
    management: ManagementSetup;
    searchUsageCollector: SearchUsageCollector;
    sessionsClient: ISessionsClient;
    searchSessionEBTManager: ISearchSessionEBTManager;
}
export interface IManagementSectionsPluginsStart {
    share: SharePluginStart;
}
export interface AppDependencies {
    share: SharePluginStart;
    uiSettings: IUiSettingsClient;
    core: CoreStart;
    api: SearchSessionsMgmtAPI;
    http: HttpStart;
    i18n: I18nStart;
    config: SearchSessionsConfigSchema;
    kibanaVersion: string;
    searchUsageCollector: SearchUsageCollector;
    searchSessionEBTManager: ISearchSessionEBTManager;
}
export declare const APP: {
    id: string;
    getI18nName: () => string;
};
export declare function registerSearchSessionsMgmt(coreSetup: CoreSetup<IManagementSectionsPluginsStart>, deps: IManagementSectionsPluginsSetup, config: SearchSessionsConfigSchema, kibanaVersion: string): import("@kbn/management-plugin/public").ManagementApp;
