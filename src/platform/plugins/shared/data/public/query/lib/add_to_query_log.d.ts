import type { IUiSettingsClient } from '@kbn/core/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { Query } from '../../../common';
interface AddToQueryLogDependencies {
    uiSettings: IUiSettingsClient;
    storage: IStorageWrapper;
}
export declare function createAddToQueryLog({ storage, uiSettings }: AddToQueryLogDependencies): (appName: string, { language, query }: Query) => void;
export {};
