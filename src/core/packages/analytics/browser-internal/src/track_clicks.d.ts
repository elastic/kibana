import type { AnalyticsClient } from '@elastic/ebt/client';
/**
 * Registers the event type "click" in the analytics client.
 * Then it listens to all the "click" events in the UI and reports them with the `target` property being a
 * full list of the element's and its parents' attributes. This allows
 * @param analytics
 */
export declare function trackClicks(analytics: AnalyticsClient, isDevMode: boolean): import("rxjs").Subscription;
