import { type Observable, type Subscription } from 'rxjs';
import type { PublishingSubject } from '@kbn/presentation-publishing';
/**
 * Exposes a PublishingSubject whose subscribers wait for children to finish loading,
 * while preserving BehaviorSubject-style synchronous reads via getValue/value.
 *
 * Subscribers use a gated observable so stale defaults (e.g. `[]` for esqlVariables$)
 * are not replayed immediately. getValue returns the latest post-load value once
 * available, otherwise falls back to the source subject.
 */
export declare function gatePublishingSubjectWhileLoading<T>(source$: PublishingSubject<T>, childrenLoading$: Observable<boolean>, subscriptions: Subscription): PublishingSubject<T>;
