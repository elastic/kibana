import type { KibanaExecutionContext } from '@kbn/core/public';
import type { MetricsExecutionContextAction, MetricsExecutionContextName } from './execution_context_enums';
/**
 * Naming convention for metrics profile execution context labels in APM.
 * Returns options suitable for spreading into search calls. Pass enum values from constants.ts, e.g. getMetricsExecutionContext(MetricsExecutionContextAction.FETCH, MetricsExecutionContextName.METRICS_INFO).
 */
export declare const getMetricsExecutionContext: (action: MetricsExecutionContextAction, name: MetricsExecutionContextName) => {
    executionContext: KibanaExecutionContext;
};
