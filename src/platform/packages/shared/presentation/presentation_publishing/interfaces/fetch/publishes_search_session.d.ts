import type { PublishingSubject } from '../../publishing_subject';
export interface PublishesSearchSession {
    searchSessionId$: PublishingSubject<string | undefined>;
    requestSearchSessionId?: () => Promise<string | undefined>;
}
export declare const apiPublishesSearchSession: (unknownApi: null | unknown) => unknownApi is PublishesSearchSession;
