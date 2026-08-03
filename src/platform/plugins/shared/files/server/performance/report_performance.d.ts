import type { PerformanceMetricEvent } from '@kbn/ebt-tools';
import type { Optional } from 'utility-types';
export interface PerfArgs {
    eventData: Optional<PerformanceMetricEvent, 'duration'>;
}
export declare function withReportPerformanceMetric<T>(perfArgs: PerfArgs, cb: () => Promise<T>): Promise<T>;
