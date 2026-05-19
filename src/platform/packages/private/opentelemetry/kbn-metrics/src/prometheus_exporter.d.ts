import { metrics } from '@elastic/opentelemetry-node/sdk';
import type { KibanaResponseFactory } from '@kbn/core-http-server';
/**
 * Prometheus exporter for OpenTelemetry with a custom extension to collect the metrics whenever
 * the Prometheus HTTP endpoint is called.
 *
 * The Prometheus HTTP endpoint is registered in the plugin monitoringCollection.
 * @privateRemarks x-pack/platform/plugins/private/monitoring_collection/server/routes/api/v1/prometheus/get_metrics.ts
 */
export declare class PrometheusExporter extends metrics.MetricReader {
    #private;
    /**
     * Gets the singleton PrometheusExporter instance.
     */
    static get(): PrometheusExporter;
    /**
     * Destroys the singleton PrometheusExporter instance.
     * @privateRemarks Mostly used for testing purposes because the same exporter cannot be reassigned to new MetricsProvider.
     */
    static destroy(): void;
    private readonly prefix;
    private readonly appendTimestamp;
    private serializer;
    private constructor();
    /**
     * Forces the AggregationTemporality to be CUMULATIVE (as required by the Prometheus format).
     */
    selectAggregationTemporality(): metrics.AggregationTemporality;
    /**
     * Implementation of the MetricReader interface onForceFlush (noop).
     * @protected
     */
    protected onForceFlush(): Promise<void>;
    /**
     * Implementation of the MetricReader interface onShutdown (noop).
     * @protected
     */
    protected onShutdown(): Promise<void>;
    /**
     * Responds to incoming message with current state of all metrics.
     * @param res {@link KibanaResponseFactory}
     */
    exportMetrics(res: KibanaResponseFactory): Promise<import("@kbn/core-http-server").IKibanaResponse<any>>;
}
