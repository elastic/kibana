import type { LogMeta } from '@kbn/logging';
import type { OpsMetrics } from '@kbn/core-metrics-server';
/**
 * Converts ops metrics into ECS-compliant `LogMeta` for logging
 *
 * @internal
 */
export declare function getEcsOpsMetricsLog(metrics: OpsMetrics): {
    message: string;
    meta: LogMeta;
};
