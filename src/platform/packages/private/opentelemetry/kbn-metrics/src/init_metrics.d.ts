import type { resources } from '@elastic/opentelemetry-node/sdk';
import type { MetricsConfig, MonitoringCollectionConfig } from '@kbn/metrics-config';
/**
 * Options to the initMetrics method
 */
export interface InitMetricsOptions {
    /**
     * The OpenTelemetry resource information
     */
    resource: resources.Resource;
    /**
     * The OpenTelemetry metrics configuration
     */
    metricsConfig: MetricsConfig;
    /**
     * The config of the Monitoring Collection plugin
     */
    monitoringCollectionConfig: MonitoringCollectionConfig;
}
/**
 * Initialize the OpenTelemetry meter provider
 * @param initMetricsOptions {@link InitMetricsOptions}
 */
export declare function initMetrics(initMetricsOptions: InitMetricsOptions): void;
