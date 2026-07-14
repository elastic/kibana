import type { METRIC_TYPE } from '.';
export type UiCounterMetricType = METRIC_TYPE.CLICK | METRIC_TYPE.LOADED | METRIC_TYPE.COUNT | string;
export interface UiCounterMetricConfig {
    type: string;
    appName: string;
    eventName: string;
    count?: number;
}
export interface UiCounterMetric {
    type: string;
    appName: string;
    eventName: string;
    count: number;
}
export declare function createUiCounterMetric({ type, appName, eventName, count, }: UiCounterMetricConfig): UiCounterMetric;
