import type { CoreStart, KibanaRequest, SavedObject, SavedObjectsFindOptions, SavedObjectsUpdateResponse } from '@kbn/core/server';
import type { IKibanaSearchRequest, ISearchOptions } from '@kbn/search-types';
import type { SearchSessionsFindResponse, SearchSessionSavedObjectAttributes, SearchSessionStatusResponse, SearchSessionStatusesResponse, SearchSessionStatus, SearchSessionRequestInfo } from '../../../common/search';
import type { SearchSessionsConfigSchema } from '../../config';
export { SearchStatus } from '../../../common/search';
export interface IScopedSearchSessionsClient {
    getId: (request: IKibanaSearchRequest, options: ISearchOptions, skipRealmCheck?: boolean) => Promise<string>;
    trackId: (searchId: string, options: ISearchOptions, skipRealmCheck?: boolean) => Promise<void>;
    getSearchIdMapping: (sessionId: string) => Promise<Map<string, string>>;
    save: (sessionId: string, attributes: Partial<SearchSessionSavedObjectAttributes>) => Promise<SavedObject<SearchSessionSavedObjectAttributes> | undefined>;
    get: (sessionId: string) => Promise<SavedObject<SearchSessionSavedObjectAttributes>>;
    find: (options: Omit<SavedObjectsFindOptions, 'type'>) => Promise<SearchSessionsFindResponse>;
    update: (sessionId: string, attributes: Partial<SearchSessionSavedObjectAttributes>) => Promise<SavedObjectsUpdateResponse<SearchSessionSavedObjectAttributes>>;
    cancel: (sessionId: string) => Promise<{}>;
    delete: (sessionId: string) => Promise<{}>;
    extend: (sessionId: string, expires: Date) => Promise<SavedObjectsUpdateResponse<SearchSessionSavedObjectAttributes>>;
    status: (sessionId: string) => Promise<SearchSessionStatusResponse>;
    updateStatuses: (sessionIds: string[]) => Promise<SearchSessionStatusesResponse>;
    getConfig: () => SearchSessionsConfigSchema;
}
export interface ISearchSessionService {
    asScopedProvider: (core: CoreStart) => (request: KibanaRequest) => IScopedSearchSessionsClient;
}
export interface SessionStatus {
    status: SearchSessionStatus;
    searchStatuses?: SearchSessionRequestInfo[];
}
