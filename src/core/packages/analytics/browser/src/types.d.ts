import type { AnalyticsClient } from '@elastic/ebt/client';
/**
 * Exposes the public APIs of the AnalyticsClient during the setup phase.
 * {@link AnalyticsClient}
 * @public
 */
export type AnalyticsServiceSetup = Omit<AnalyticsClient, 'flush' | 'shutdown'>;
/**
 * Exposes the public APIs of the AnalyticsClient during the start phase
 * {@link AnalyticsClient}
 * @public
 */
export type AnalyticsServiceStart = Pick<AnalyticsClient, 'optIn' | 'reportEvent' | 'telemetryCounter$'>;
/**
 * API exposed through `window.__kbnAnalytics`
 */
export interface KbnAnalyticsWindowApi {
    /**
     * Returns a promise that resolves when all the events in the queue have been sent.
     */
    flush: AnalyticsClient['flush'];
}
declare global {
    interface Window {
        __kbnAnalytics: KbnAnalyticsWindowApi;
    }
}
