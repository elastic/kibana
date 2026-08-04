import type { ExpressionRendererEvent } from '@kbn/expressions-plugin/public';
import type React from 'react';
export type Simplify<T> = {
    [KeyType in keyof T]: T[KeyType];
} & {};
export type MakeOverridesSerializable<T> = {
    [KeyType in keyof T]: NonNullable<T[KeyType]> extends Function ? 'ignore' : NonNullable<T[KeyType]> extends React.ReactChildren | React.ReactElement ? never : NonNullable<T[KeyType]> extends object ? MakeOverridesSerializable<T[KeyType]> : NonNullable<T[KeyType]>;
};
export interface ChartSizeEvent extends ExpressionRendererEvent {
    name: 'chartSize';
    data: ChartSizeSpec;
}
export type ChartSizeUnit = 'pixels' | 'percentage';
interface ChartSizeDimensions {
    x?: {
        value: number;
        unit: ChartSizeUnit;
    };
    y?: {
        value: number;
        unit: ChartSizeUnit;
    };
}
export interface ChartSizeSpec {
    maxDimensions?: ChartSizeDimensions;
    minDimensions?: ChartSizeDimensions;
    aspectRatio?: {
        x: number;
        y: number;
    };
}
export declare function isChartSizeEvent(event: ExpressionRendererEvent): event is ChartSizeEvent;
export {};
