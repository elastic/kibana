import type { TourId } from '..';
/**
 * Result object returned by useTourQueue
 * @public
 */
export interface TourQueueResult {
    /** Whether this tour is currently active and should be shown */
    isActive: boolean;
    /** Callback to mark this tour as completed */
    onComplete: () => void;
}
/**
 * Hook to manage tour queue state for a specific tour.
 * Automatically registers the tour, subscribes to queue changes,
 * and handles cleanup on unmount.
 *
 * @param tourId - The ID of the tour. Must be a valid ID from {@link TOURS}
 * @returns Object containing isActive state and onComplete callback
 * @public
 */
export declare const useTourQueue: (tourId: TourId) => TourQueueResult;
