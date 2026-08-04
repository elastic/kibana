import type { LensLayerType } from './types';
export declare const lensLayerTypeTabDisplayNames: {
    readonly data: string;
    readonly referenceLine: string;
    readonly annotations: string;
    readonly metricTrendline: string;
    readonly unknown: string;
};
export declare function getLensLayerTypeTabDisplayName(layerType?: LensLayerType, layerTypeCount?: number, countForLayerId?: number): string;
