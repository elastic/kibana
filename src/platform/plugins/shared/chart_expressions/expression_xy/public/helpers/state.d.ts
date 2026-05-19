import type { CommonXYLayerConfig } from '../../common';
export declare function isHorizontalChart(layers: CommonXYLayerConfig[]): boolean;
export declare const getSeriesColor: (layer: CommonXYLayerConfig, accessor: string) => string | null;
