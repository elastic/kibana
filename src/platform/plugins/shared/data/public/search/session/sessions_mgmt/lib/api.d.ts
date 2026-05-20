import type { ApplicationStart, FeatureFlagsStart, NotificationsStart } from '@kbn/core/public';
import moment from 'moment';
import type { SearchSessionStatusResponse } from '../../../../../common';
import type { SearchSessionSavedObject } from '../types';
import type { ISessionsClient } from '../../sessions_client';
import type { SearchUsageCollector } from '../../../collectors';
import type { SearchSessionsConfigSchema } from '../../../../../server/config';
interface SearchSessionManagementDeps {
    notifications: NotificationsStart;
    application: ApplicationStart;
    usageCollector?: SearchUsageCollector;
    featureFlags: FeatureFlagsStart;
}
interface FetchReturn {
    savedObjects: SearchSessionSavedObject[];
    statuses: Record<string, SearchSessionStatusResponse>;
}
export declare class SearchSessionsMgmtAPI {
    private sessionsClient;
    private config;
    private deps;
    constructor(sessionsClient: ISessionsClient, config: SearchSessionsConfigSchema, deps: SearchSessionManagementDeps);
    fetchTableData({ appId }?: {
        appId?: string;
    }): Promise<FetchReturn>;
    getExtendByDuration(): moment.Duration;
    sendDelete(id: string): Promise<void>;
    sendExtend(id: string, expires: string): Promise<void>;
    sendRename(id: string, newName: string): Promise<void>;
}
export {};
