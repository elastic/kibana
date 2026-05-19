import type { ErrorLike } from '@kbn/expressions-plugin/common';
import type { PublishingSubject } from '../publishing_subject';
/** ------------------------------------------------------------------------------------------
 * Performance Tracking Types
 * ------------------------------------------------------------------------------------------ */
export type PhaseEventType = 'loading' | 'loaded' | 'rendered' | 'error';
export interface PhaseEvent {
    id: string;
    status: PhaseEventType;
    error?: ErrorLike;
    timeToEvent: number;
}
export interface PublishesPhaseEvents {
    phase$: PublishingSubject<PhaseEvent | undefined>;
}
export declare const apiPublishesPhaseEvents: (unknownApi: null | unknown) => unknownApi is PublishesPhaseEvents;
