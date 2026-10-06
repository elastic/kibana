import type { PublishingSubject } from '../..';
/**
 * Parent APIs can publish a fetch setting that determines when child components should fetch data.
 */
export interface PublishesFetchOnlyVisible {
    fetchOnlyVisible$: PublishingSubject<boolean>;
}
export declare const apiPublishesFetchOnlyVisible: (unknownApi?: unknown) => unknownApi is PublishesFetchOnlyVisible;
