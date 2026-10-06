import type { PublishingSubject } from '../publishing_subject';
export interface PublishesDisabledActionIds {
    disabledActionIds$: PublishingSubject<string[] | undefined>;
    setDisabledActionIds: (ids: string[] | undefined) => void;
    getAllTriggersDisabled?: () => boolean;
}
/**
 * A type guard which checks whether or not a given API publishes Disabled Action IDs.  This can be used
 * to programatically limit which actions are available on a per-API basis.
 */
export declare const apiPublishesDisabledActionIds: (unknownApi: null | unknown) => unknownApi is PublishesDisabledActionIds;
