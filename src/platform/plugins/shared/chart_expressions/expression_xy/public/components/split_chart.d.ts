import React from 'react';
import type { ExpressionValueVisDimension } from '@kbn/chart-expressions-common';
import type { Datatable } from '@kbn/expressions-plugin/public';
interface SplitChartProps {
    splitColumnAccessor?: ExpressionValueVisDimension | string;
    splitRowAccessor?: ExpressionValueVisDimension | string;
    columns: Datatable['columns'];
}
export declare const SplitChart: ({ splitColumnAccessor, splitRowAccessor, columns }: SplitChartProps) => React.JSX.Element | null;
export {};
