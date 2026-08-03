import type { PublishingSubject } from '../publishing_subject';
/**
 * This API publishes a saved object id which can be used to determine which saved object this API is linked to.
 */
export interface PublishesSavedObjectId {
    savedObjectId$: PublishingSubject<string | undefined>;
}
/**
 * A type guard which can be used to determine if a given API publishes a saved object id.
 */
export declare const apiPublishesSavedObjectId: (unknownApi: null | unknown) => unknownApi is PublishesSavedObjectId;
