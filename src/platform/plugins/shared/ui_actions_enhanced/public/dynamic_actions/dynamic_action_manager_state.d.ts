import type { SerializedEvent } from './types';
/**
 * This interface represents the state of @type {DynamicActionManager} at every
 * point in time.
 */
export interface State {
    /**
     * Whether dynamic action manager is currently in process of fetching events
     * from storage.
     */
    readonly isFetchingEvents: boolean;
    /**
     * Number of times event fetching has been completed.
     */
    readonly fetchCount: number;
    /**
     * Error received last time when fetching events.
     */
    readonly fetchError?: {
        message: string;
    };
    /**
     * List of all fetched events.
     */
    readonly events: readonly SerializedEvent[];
}
export interface Transitions {
    startFetching: (state: State) => () => State;
    finishFetching: (state: State) => (events: SerializedEvent[]) => State;
    failFetching: (state: State) => (error: {
        message: string;
    }) => State;
    addEvent: (state: State) => (event: SerializedEvent) => State;
    removeEvent: (state: State) => (eventId: string) => State;
    replaceEvent: (state: State) => (event: SerializedEvent) => State;
}
export interface Selectors {
    getEvent: (state: State) => (eventId: string) => SerializedEvent | null;
}
export declare const defaultState: State;
export declare const transitions: Transitions;
export declare const selectors: Selectors;
