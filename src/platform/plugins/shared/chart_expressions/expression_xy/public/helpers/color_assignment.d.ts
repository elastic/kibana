import type { ExpressionValueVisDimension } from '@kbn/chart-expressions-common';
import type { CommonXYDataLayerConfig, CommonXYLayerConfig } from '../../common';
import type { LayerAccessorsTitles, LayerFieldFormats, LayersAccessorsTitles, LayersFieldFormats } from './layers';
import type { DatatablesWithFormatInfo, DatatableWithFormatInfo } from './data_layers';
export declare const defaultReferenceLineColor: string;
export type ColorAssignments = Record<string, {
    totalSeriesCount: number;
    getRank(layerId: string, seriesName: string): number;
}>;
export declare const getAllSeries: (formattedDatatable: DatatableWithFormatInfo, splitAccessors: CommonXYDataLayerConfig["splitAccessors"], accessors: Array<ExpressionValueVisDimension | string>, columnToLabel: CommonXYDataLayerConfig["columnToLabel"], titles: LayerAccessorsTitles, fieldFormats: LayerFieldFormats, accessorsCount: number, multipleLayersWithSplits: boolean) => string[];
/**
 * This function joins every data series name available on each layer by the same color palette.
 * The returned function `getRank` should return the position of a series name in this unified list by palette.
 */
export declare function getColorAssignments(layers: CommonXYLayerConfig[], titles: LayersAccessorsTitles, fieldFormats: LayersFieldFormats, formattedDatatables: DatatablesWithFormatInfo): ColorAssignments;
