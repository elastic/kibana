import type { AnalyticsClient } from '@elastic/ebt/client';
export interface ViewportSize {
    viewport_width: number;
    viewport_height: number;
}
/**
 * Registers the event type "viewport_size" in the analytics client, and the context provider with the same name.
 * Then it listens to all the "resize" events in the UI and reports their size as {@link ViewportSize}
 * @param analytics
 */
export declare function trackViewportSize(analytics: AnalyticsClient): import("rxjs").Subscription;
