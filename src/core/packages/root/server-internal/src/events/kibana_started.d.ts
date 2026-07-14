import type { AnalyticsServiceSetup, AnalyticsServiceStart } from '@kbn/core-analytics-server';
/** @internal */
export interface UptimePerStep {
    start: number;
    end: number;
}
/** @internal */
export interface UptimeSteps {
    constructor: UptimePerStep;
    preboot: UptimePerStep;
    setup: UptimePerStep;
    start: UptimePerStep;
    elasticsearch: {
        waitTime: number;
    };
    savedObjects: {
        migrationTime: number;
    };
}
export declare const registerKibanaStartedEvent: (analytics: AnalyticsServiceSetup) => void;
/**
 * Reports the new and legacy KIBANA_STARTED_EVENT.
 */
export declare const reportKibanaStartedEvent: ({ analytics, uptimeSteps, }: {
    analytics: AnalyticsServiceStart;
    uptimeSteps: UptimeSteps;
}) => void;
