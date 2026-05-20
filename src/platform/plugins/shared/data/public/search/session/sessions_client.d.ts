import type { PublicContract } from '@kbn/utility-types';
import type { HttpSetup } from '@kbn/core/public';
import type { SavedObject, SavedObjectsUpdateResponse, SavedObjectsFindOptions } from '@kbn/core/server';
import type { SearchSessionSavedObjectAttributes, SearchSessionsFindResponse, SearchSessionStatusesResponse } from '../../../common';
export type SearchSessionSavedObject = SavedObject<SearchSessionSavedObjectAttributes>;
export type ISessionsClient = PublicContract<SessionsClient>;
export interface SessionsClientDeps {
    http: HttpSetup;
}
/**
 * CRUD Search Session SO
 */
export declare class SessionsClient {
    private readonly http;
    constructor(deps: SessionsClientDeps);
    get(sessionId: string): Promise<SearchSessionSavedObject>;
    create({ name, appId, locatorId, initialState, restoreState, sessionId, }: {
        name: string;
        appId: string;
        locatorId: string;
        initialState: Record<string, unknown>;
        restoreState: Record<string, unknown>;
        sessionId: string;
    }): Promise<SearchSessionSavedObject>;
    find(opts: Omit<SavedObjectsFindOptions, 'type'>): Promise<SearchSessionsFindResponse>;
    update(sessionId: string, attributes: unknown): Promise<SavedObjectsUpdateResponse<SearchSessionSavedObjectAttributes>>;
    rename(sessionId: string, newName: string): Promise<void>;
    extend(sessionId: string, expires: string): Promise<void>;
    delete(sessionId: string): Promise<void>;
    status(sessionIds: string[]): Promise<SearchSessionStatusesResponse>;
}
