import { UiStatsMetric, UiStatsMetricType } from './ui_stats';
export { UiStatsMetric, createUiStatsMetric, UiStatsMetricReport, UiStatsMetricType, } from './ui_stats';
export { Stats } from './stats';
export declare type Metric = UiStatsMetric<UiStatsMetricType>;
export declare type MetricType = keyof typeof METRIC_TYPE;
export declare enum METRIC_TYPE {
    COUNT = "count",
    LOADED = "loaded",
    CLICK = "click"
}
//# sourceMappingURL=index.d.ts.map