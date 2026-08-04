import type { SerializableRecord } from '@kbn/utility-types';
interface SearchSessionAttrRestResponse {
    sessionId: string;
    name?: string;
    appId?: string;
    created: string;
    expires: string;
    locatorId?: string;
    initialState?: SerializableRecord;
    restoreState?: SerializableRecord;
    idMapping: Record<string, SearchSessionRequestInfoRestResponse>;
    realmType?: string;
    realmName?: string;
    username?: string;
    version: string;
    isCanceled?: boolean;
    status?: StatusRestRespone;
}
interface SearchSessionRequestInfoRestResponse {
    id: string;
    strategy: string;
    startedAt?: string;
    completedAt?: string;
    status?: string;
}
export interface SearchSessionRestResponse {
    id: string;
    attributes: SearchSessionAttrRestResponse;
}
interface Status {
    status: StatusRestRespone;
    errors?: string[];
}
export type SearchSessionStatusRestResponse = Status;
export interface SearchSessionStatusesResponse {
    statuses: Record<string, Status>;
}
type StatusRestRespone = 'in_progress' | 'error' | 'complete' | 'cancelled' | 'expired';
export interface SearchSessionsFindRestResponse {
    saved_objects: SearchSessionRestResponse[];
    total: number;
    /**
     * Map containing calculated statuses of search sessions from the find response
     */
    statuses: Record<string, Status>;
}
export interface SearchSessionsUpdateRestResponse {
    id: string;
    type: string;
    updated_at?: string;
    version?: string;
    namespaces?: string[];
    references?: Array<{
        id: string;
        type: string;
        name: string;
    }>;
    attributes: {
        name?: string;
        expires?: string;
    };
}
export {};
