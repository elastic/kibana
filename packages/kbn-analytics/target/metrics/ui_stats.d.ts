import { Stats } from './stats';
import { METRIC_TYPE } from './';
export declare type UiStatsMetricType = METRIC_TYPE.CLICK | METRIC_TYPE.LOADED | METRIC_TYPE.COUNT;
export interface UiStatsMetricConfig<T extends UiStatsMetricType> {
    type: T;
    appName: string;
    eventName: string;
    count?: number;
}
export interface UiStatsMetric<T extends UiStatsMetricType = UiStatsMetricType> {
    type: T;
    appName: string;
    eventName: string;
    count: number;
}
export declare function createUiStatsMetric<T extends UiStatsMetricType>({ type, appName, eventName, count, }: UiStatsMetricConfig<T>): UiStatsMetric<T>;
export interface UiStatsMetricReport {
    key: string;
    appName: string;
    eventName: string;
    type: UiStatsMetricType;
    stats: Stats;
}
//# sourceMappingURL=ui_stats.d.ts.map