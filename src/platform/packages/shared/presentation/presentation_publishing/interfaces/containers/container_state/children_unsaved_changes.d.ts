import type { PublishingSubject } from '../../../publishing_subject';
export declare const DEBOUNCE_TIME = 100;
/**
 *  Create an observable stream of unsaved changes from all react embeddable children
 */
export declare function childrenUnsavedChanges$<Api extends unknown = unknown>(children$: PublishingSubject<{
    [key: string]: Api;
}>): import("rxjs").Observable<{
    uuid: string;
    hasUnsavedChanges: boolean;
}[]>;
