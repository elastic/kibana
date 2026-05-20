import { TourQueueStateManager } from './tour_queue_state';
/**
 * Get or create the global tour queue instance.
 * This ensures a single state manager is shared across all plugins and bundles.
 * @internal
 * @remarks
 * Prefer using hook {@link useTourQueue}
 * @returns The global tour queue state manager instance
 */
export declare const getTourQueue: () => TourQueueStateManager;
