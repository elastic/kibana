import type { PublishingSubject } from '../../../publishing_subject';
/**
 * Create an observable stream of latest state from all react embeddable children
 */
export declare function childrenLatestState$<Api extends unknown = unknown>(children$: PublishingSubject<{
    [key: string]: Api;
}>): import("rxjs").Observable<{
    uuid: string;
    latestState: object;
}[]>;
