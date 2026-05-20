export { useTourQueue } from './hooks/use_tour_queue';
export { getTourQueue } from './state/registry';
export type { TourQueueResult } from './hooks/use_tour_queue';
export type { Tour } from './state/tour_queue_state';
/**
 * Valid tour IDs for registering tours in the queue.
 * Tours are shown in order based on their registry value.
 * @public
 */
export declare const TOURS: {
    readonly SPACES_SOLUTION_VIEW_SWITCH: "spacesSolutionViewSwitchTour";
};
/**
 * Union type of all available tour IDs
 * @public
 */
export type TourId = (typeof TOURS)[keyof typeof TOURS];
/**
 * Get the display order for a tour. Lower numbers are shown first.
 * @param tourId - The tour ID
 * @returns The numeric order value for the tour
 * @internal
 */
export declare const getOrder: (tourId: TourId) => number;
