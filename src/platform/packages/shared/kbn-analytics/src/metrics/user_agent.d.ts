import { METRIC_TYPE } from '.';
export interface UserAgentMetric {
    type: METRIC_TYPE.USER_AGENT;
    appName: string;
    userAgent: string;
}
export declare function trackUsageAgent(appName: string): UserAgentMetric;
