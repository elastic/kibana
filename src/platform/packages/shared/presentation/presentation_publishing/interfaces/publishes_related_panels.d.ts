import type { PublishingSubject } from '../publishing_subject';
export interface PublishesRelatedPanels {
    relatedPanels$: PublishingSubject<string[]>;
}
export declare const apiPublishesRelatedPanels: (unknownApi: null | unknown) => unknownApi is PublishesRelatedPanels;
