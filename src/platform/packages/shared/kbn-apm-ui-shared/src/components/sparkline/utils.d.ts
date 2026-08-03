import type { LineSeriesStyle, PartialTheme, RecursivePartial } from '@elastic/charts';
export interface SparklinePoint {
    x: number;
    y: number | null;
}
export interface SplitSeriesResult {
    mainSegments: SparklinePoint[][];
    leadingEdge: SparklinePoint[] | null;
    trailingEdge: SparklinePoint[] | null;
    interiorEdges: SparklinePoint[][];
}
export declare const DOTTED_LINE_STYLE: RecursivePartial<LineSeriesStyle>;
export declare const COMPARISON_CHART_THEME: PartialTheme;
export declare function splitSeriesAtNullGaps(data: ReadonlyArray<SparklinePoint>): SplitSeriesResult;
