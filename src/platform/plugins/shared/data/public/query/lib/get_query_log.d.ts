import type { IUiSettingsClient } from '@kbn/core/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { PersistedLog } from '../persisted_log';
/** @internal */
export declare function getQueryLog(uiSettings: IUiSettingsClient, storage: IStorageWrapper, appName: string, language: string): PersistedLog<any>;
