import React from 'react';
import type { FC } from 'react';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
interface Props {
    charts: ChartsPluginStart;
    values: number[];
    isDetails: boolean;
    defaultRowHeight?: number;
}
export declare const SparklineCellRenderer: FC<Props>;
export declare function getSparklineCellRenderer(charts: ChartsPluginStart, values: unknown, isDetails: boolean, defaultRowHeight?: number): "-" | React.JSX.Element;
export {};
