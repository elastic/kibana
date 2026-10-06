import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
export { reportKibanaStartedEvent, type UptimeSteps } from './kibana_started';
export declare const registerRootEvents: (analytics: AnalyticsServiceSetup) => void;
