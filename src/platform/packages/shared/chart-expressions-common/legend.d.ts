import type { LegendValue, Position } from '@elastic/charts';
export declare enum LegendSize {
    AUTO = "auto",
    SMALL = "small",
    MEDIUM = "medium",
    LARGE = "large",
    EXTRA_LARGE = "xlarge"
}
export declare enum LegendLayout {
    List = "list"
}
export declare function getLegendLayout({ isInside, position, layout, }: {
    isInside?: boolean;
    position?: Position;
    layout?: LegendLayout;
}): LegendLayout | undefined;
export declare const LegendSizeToPixels: {
    readonly auto: undefined;
    readonly small: 80;
    readonly medium: 130;
    readonly large: 180;
    readonly xlarge: 230;
};
export declare const DEFAULT_LEGEND_SIZE = LegendSize.MEDIUM;
/**
 * This is a shared type between XY Expression and Annotation plugins.
 * We've put it here to avoid a circular dependency between the two plugins.
 */
export type XYLegendValue = Extract<LegendValue, 'currentAndLastValue' | 'lastValue' | 'lastNonNullValue' | 'average' | 'median' | 'max' | 'min' | 'firstValue' | 'firstNonNullValue' | 'total' | 'count' | 'distinctCount' | 'variance' | 'stdDeviation' | 'range' | 'difference' | 'differencePercent'>;
