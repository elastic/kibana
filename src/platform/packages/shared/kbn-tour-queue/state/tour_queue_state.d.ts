import { type TourId } from '..';
/**
 * Tour object returned by the queue when registering a tour.
 * Provides methods to control the tour's lifecycle.
 * @public
 */
export interface Tour {
    /** Check if this tour is currently active in the queue */
    isActive: () => boolean;
    /** Skip all tours in the queue for the current page load only */
    skip: () => void;
    /** Mark this tour as completed */
    complete: () => void;
    /** Unregister this tour from the queue */
    unregister: () => void;
}
export interface TourQueueState {
    registeredTourIds: TourId[];
    completedTourIds: Set<TourId>;
    isQueueSkipped: boolean;
}
export declare class TourQueueStateManager {
    private registeredTourIds;
    private completedTourIds;
    private isQueueSkipped;
    private subscribers;
    constructor();
    register(tourId: TourId): Tour;
    getActive(): TourId | null;
    isActive(tourId: TourId): boolean;
    unregister(tourId: TourId): void;
    complete(tourId: TourId): void;
    skipAll(): void;
    getState(): TourQueueState;
    subscribe(callback: () => void): () => void;
    private notifySubscribers;
}
