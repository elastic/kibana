import type { MetricUnit } from '../../../types';
/**
 * Normalizes a unit string to a standard MetricUnit.
 * Handles OTel and ECS unit formats.
 * For ratio fields (containing 'utilization'), defaults to 'percent'.
 */
export declare const normalizeUnit: ({ fieldName, unit, }: {
    fieldName: string;
    unit: string | undefined;
}) => MetricUnit | undefined;
