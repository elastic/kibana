import type { Moment } from 'moment-timezone';
import { METRIC_TYPE } from '.';
export interface ApplicationUsageMetric {
    type: METRIC_TYPE.APPLICATION_USAGE;
    appId: string;
    viewId: string;
    startTime: Moment;
    numberOfClicks: number;
}
export declare function createApplicationUsageMetric(appId: string, viewId: string): ApplicationUsageMetric;
