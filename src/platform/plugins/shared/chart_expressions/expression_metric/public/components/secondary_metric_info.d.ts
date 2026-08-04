import type { DatatableColumn, DatatableRow } from '@kbn/expressions-plugin/common';
import type { DimensionsVisParam, MetricVisParam } from '../../common';
export interface TrendConfig {
    showIcon: boolean;
    showValue: boolean;
    palette: [string, string, string];
    textPalette?: [string, string, string];
    baselineValue: number | undefined;
    borderColor?: string;
    compareToPrimary: boolean;
}
export interface SecondaryMetricInfoArgs {
    row: DatatableRow;
    columns: DatatableColumn[];
    secondaryMetric: NonNullable<DimensionsVisParam['secondaryMetric']>;
    secondaryLabel: MetricVisParam['secondaryLabel'];
    trendConfig?: TrendConfig;
    staticColor?: string;
}
export interface SecondaryMetricInfo {
    value: string;
    label?: string;
    badgeColor?: string;
    badgeTextColor?: string;
    description?: string;
    icon?: string;
}
/** Computes the display information for the Secondary Metric */
export declare function getSecondaryMetricInfo({ row, columns, secondaryMetric, secondaryLabel, trendConfig, staticColor, }: SecondaryMetricInfoArgs): SecondaryMetricInfo;
