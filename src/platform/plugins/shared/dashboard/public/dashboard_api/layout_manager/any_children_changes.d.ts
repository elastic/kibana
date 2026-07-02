import type { PublishingSubject } from '@kbn/presentation-publishing';
/**
 *  Create an observable stream of any children changes
 */
export declare function anyChildrenChanges$<Api extends unknown = unknown>(children$: PublishingSubject<{
    [key: string]: Api;
}>): import("rxjs").Observable<void>;
