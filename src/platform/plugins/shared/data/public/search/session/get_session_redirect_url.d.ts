import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorsStart } from './sessions_mgmt/types';
interface GetRedirectUrlFromStateParams {
    locators: LocatorsStart;
    locatorId?: string;
    state?: SerializableRecord;
}
export declare const getRedirectUrlFromState: ({ locators, locatorId, state, }: GetRedirectUrlFromStateParams) => string | undefined;
interface GetRestoreUrlParams {
    locators: LocatorsStart;
    locatorId?: string;
    restoreState?: SerializableRecord;
    sessionName?: string;
}
export declare const getRestoreUrl: ({ locators, locatorId, restoreState, sessionName, }: GetRestoreUrlParams) => string | undefined;
export {};
