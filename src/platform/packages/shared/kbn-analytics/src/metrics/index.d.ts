import type { UiCounterMetric } from './ui_counter';
import type { UserAgentMetric } from './user_agent';
import type { ApplicationUsageMetric } from './application_usage';
export type { ApplicationUsageMetric } from './application_usage';
export type { UiCounterMetric, UiCounterMetricType } from './ui_counter';
export { createUiCounterMetric } from './ui_counter';
export { trackUsageAgent } from './user_agent';
export { createApplicationUsageMetric } from './application_usage';
export type Metric = UiCounterMetric | UserAgentMetric | ApplicationUsageMetric;
export declare enum METRIC_TYPE {
    COUNT = "count",
    LOADED = "loaded",
    CLICK = "click",
    USER_AGENT = "user_agent",
    APPLICATION_USAGE = "application_usage"
}
