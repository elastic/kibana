import type { MetricUnit, NullableMetricUnit } from '../../../types';
/**
 * Resolves the unit for a metric by normalizing and selecting the best option.
 * Normalizes raw units (e.g., 'byte' -> 'bytes') and handles multiple units.
 */
export declare const resolveMetricUnit: (metricName: string, units: NullableMetricUnit[]) => MetricUnit | undefined;
