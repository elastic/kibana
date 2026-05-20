import type { SavedObject } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { type SearchSessionRequestInfo, type SearchSessionSavedObjectAttributes } from '../../../../common';
export interface ISearchSessionEBTManager {
    trackBgsCompleted: (args: {
        session: SavedObject<SearchSessionSavedObjectAttributes>;
        searchStatuses: SearchSessionRequestInfo[];
    }) => void;
    trackBgsError: (args: {
        session: SavedObject<SearchSessionSavedObjectAttributes>;
        searchStatuses: SearchSessionRequestInfo[];
    }) => void;
}
export declare class SearchSessionEBTManager {
    private readonly reportEventCore?;
    private readonly logger?;
    constructor(reportEventCore?: ((eventType: string, eventData: Record<string, string | number>) => void) | undefined, logger?: Logger | undefined);
    trackBgsCompleted({ session, searchStatuses, }: {
        session: SavedObject<SearchSessionSavedObjectAttributes>;
        searchStatuses: SearchSessionRequestInfo[];
    }): void;
    trackBgsError({ session, searchStatuses, }: {
        session: SavedObject<SearchSessionSavedObjectAttributes>;
        searchStatuses: SearchSessionRequestInfo[];
    }): void;
    private reportEvent;
    private getSessionRuntimeMs;
}
