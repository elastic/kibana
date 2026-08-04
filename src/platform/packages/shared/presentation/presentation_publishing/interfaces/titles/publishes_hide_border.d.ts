import type { PublishingSubject } from '../../publishing_subject';
export interface PublishesHideBorder {
    hideBorder$: PublishingSubject<boolean | undefined>;
}
export type PublishesWritableHideBorder = PublishesHideBorder & {
    setHideBorder: (hideBorder: boolean | undefined) => void;
};
export declare const apiPublishesHideBorder: (unknownApi: unknown | null) => unknownApi is PublishesHideBorder;
export declare const apiPublishesWritableHideBorder: (unknownApi: unknown | null) => unknownApi is PublishesWritableHideBorder;
