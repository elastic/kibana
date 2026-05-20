import type { PublishingSubject } from '../publishing_subject';
export interface PublishesDataLoading {
    dataLoading$: PublishingSubject<boolean | undefined>;
}
export declare const apiPublishesDataLoading: (unknownApi: null | unknown) => unknownApi is PublishesDataLoading;
