import type { AnalyticsClient } from '@elastic/ebt/client';
/**
 * Exposes the public APIs of the AnalyticsClient during the preboot phase
 * {@link AnalyticsClient}
 * @public
 */
export type AnalyticsServicePreboot = Omit<AnalyticsClient, 'flush' | 'shutdown'>;
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
