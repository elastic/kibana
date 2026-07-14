import type { Observable } from 'rxjs';
import type { EluMetrics, OpsMetrics } from './metrics';
/**
 * APIs to retrieves metrics gathered and exposed by the core platform.
 *
 * @public
 */
export interface MetricsServiceSetup {
    /** Interval metrics are collected in milliseconds */
    readonly collectionInterval: number;
    /**
     * Retrieve an observable emitting {@link EluMetrics}.
     */
    getEluMetrics$(): Observable<EluMetrics>;
    /**
     * Retrieve an observable emitting the {@link OpsMetrics} gathered.
     * The observable will emit an initial value during core's `start` phase, and a new value every fixed interval of time,
     * based on the `opts.interval` configuration property.
     *
     * @example
     * ```ts
     * core.metrics.getOpsMetrics$().subscribe(metrics => {
     *   // do something with the metrics
     * })
     * ```
     */
    getOpsMetrics$: () => Observable<OpsMetrics>;
}
/**
 * {@inheritdoc MetricsServiceSetup}
 *
 * @public
 */
export type MetricsServiceStart = MetricsServiceSetup;
