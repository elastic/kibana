import type { FC } from 'react';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
interface SparklineChartProps {
    charts: ChartsPluginStart;
    values?: number[];
    rowHeight?: number;
}
export declare const SparklineChart: FC<SparklineChartProps>;
export {};
