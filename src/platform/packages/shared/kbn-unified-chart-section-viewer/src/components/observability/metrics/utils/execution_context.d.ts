import type { KibanaExecutionContext } from '@kbn/core/public';
import type { MetricsExecutionContextAction, MetricsExecutionContextName } from './execution_context_enums';
/**
 * Returns execution context options for spreading into search calls.
 * When `meta` is provided it is forwarded to `executionContext.meta`,
 * which the server-side pipeline flattens onto the APM transaction as `kibana_meta_*` labels.
 */
export declare const getMetricsExecutionContext: (action: MetricsExecutionContextAction, name: MetricsExecutionContextName, meta?: KibanaExecutionContext["meta"]) => {
    executionContext: KibanaExecutionContext;
};
