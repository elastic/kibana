import type { EventData } from '../performance_context';
export declare function measureInteraction(pathname: string): {
    /**
     * Marks the end of the page ready state and measures the performance between the start of the page change and the end of the page ready state.
     * @param pathname - The pathname of the page.
     * @param customMetrics - Custom metrics to be included in the performance measure.
     */
    pageReady(eventData?: EventData): void;
    pageRefreshStart(): void;
};
