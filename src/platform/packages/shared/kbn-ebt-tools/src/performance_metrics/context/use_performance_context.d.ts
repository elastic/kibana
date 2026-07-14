import type { EventData } from './performance_context';
export interface PerformanceApi {
    /**
     * Marks the end of the page ready state and measures the performance between the start of the page change and the end of the page ready state.
     * @param eventData - Data to send with the performance measure, conforming the structure of a {@link EventData}.
     */
    onPageReady(eventData?: EventData): void;
    /**
     * Marks the start of a page refresh event for performance tracking.
     * This method adds a performance marker start::pageRefresh to indicate when a page refresh begins.
     *
     * Usage:
     * ```ts
     * onPageRefreshStart();
     * ```
     *
     * The marker set by this function can later be used in performance measurements
     * along with an end marker end::pageReady to determine the total refresh duration.
     */
    onPageRefreshStart(): void;
}
export declare const PerformanceContext: import("react").Context<PerformanceApi | undefined>;
export declare function usePerformanceContext(): PerformanceApi;
