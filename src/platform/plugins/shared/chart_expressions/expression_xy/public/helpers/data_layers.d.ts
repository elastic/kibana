import type { AreaSeriesProps, BarSeriesProps, LineSeriesProps, SeriesName, XYChartSeriesIdentifier } from '@elastic/charts';
import type { IFieldFormat } from '@kbn/field-formats-plugin/common';
import type { PersistedState } from '@kbn/visualizations-common';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { ExpressionValueVisDimension } from '@kbn/chart-expressions-common';
import type { PaletteRegistry } from '@kbn/coloring';
import type { KbnPalettes } from '@kbn/palettes';
import { type RawValue } from '@kbn/data-plugin/common';
import type { CommonXYDataLayerConfig, CommonXYLayerConfig, XScaleType, PointVisibility } from '../../common';
import type { FormatFactory } from '../types';
import type { ColorAssignments } from './color_assignment';
import type { GroupsConfiguration } from './axes_configuration';
import type { LayerAccessorsTitles, LayerFieldFormats, LayersFieldFormats } from './layers';
type SeriesSpec = LineSeriesProps & BarSeriesProps & AreaSeriesProps;
export type InvertedRawValueMap = Map<string, Map<string, RawValue>>;
type GetSeriesPropsFn = (config: {
    layer: CommonXYDataLayerConfig;
    titles?: LayerAccessorsTitles;
    accessor: string | string[];
    chartHasMoreThanOneBarSeries?: boolean;
    formatFactory: FormatFactory;
    colorAssignments: ColorAssignments;
    columnToLabelMap: Record<string, string>;
    paletteService: PaletteRegistry;
    palettes: KbnPalettes;
    yAxis?: GroupsConfiguration[number];
    xAxis?: GroupsConfiguration[number];
    syncColors: boolean;
    timeZone: string;
    emphasizeFitting?: boolean;
    fillOpacity?: number;
    formattedDatatableInfo: DatatableWithFormatInfo;
    defaultXScaleType: XScaleType;
    fieldFormats: LayersFieldFormats;
    uiState?: PersistedState;
    allYAccessors: Array<string | ExpressionValueVisDimension>;
    singleTable?: boolean;
    multipleLayersWithSplits: boolean;
    isDarkMode: boolean;
    pointVisibility?: PointVisibility;
}) => SeriesSpec;
type GetSeriesNameFn = (data: XYChartSeriesIdentifier, config: {
    splitAccessors: Array<string | ExpressionValueVisDimension>;
    accessorsCount: number;
    columns: Datatable['columns'];
    splitAccessorsFormats: LayerFieldFormats['splitSeriesAccessors'];
    alreadyFormattedColumns: Record<string, boolean>;
    columnToLabelMap: Record<string, string>;
    multipleLayersWithSplits: boolean;
}, titles: LayerAccessorsTitles) => SeriesName;
export interface DatatableWithFormatInfo {
    table: Datatable;
    formattedColumns: Record<string, true>;
    /**
     * Inverse map per column to link formatted string to complex values (i.e. `RangeKey`).
     */
    invertedRawValueMap: InvertedRawValueMap;
}
export type DatatablesWithFormatInfo = Record<string, DatatableWithFormatInfo>;
export type FormattedDatatables = Record<string, Datatable>;
export declare const getFormattedRow: (row: Datatable["rows"][number], columns: Datatable["columns"], columnsFormatters: Record<string, IFieldFormat>, xAccessor: string | undefined, categoricalAccessors: string[], xScaleType: XScaleType, invertedRawValueMap: InvertedRawValueMap) => {
    row: Datatable["rows"][number];
    formattedColumns: Record<string, true>;
};
export declare const getFormattedTable: (table: Datatable, formatFactory: FormatFactory, xAccessor: string | ExpressionValueVisDimension | undefined, accessors: Array<string | ExpressionValueVisDimension>, xScaleType: XScaleType) => DatatableWithFormatInfo;
export declare const getFormattedTablesByLayers: (layers: CommonXYDataLayerConfig[], formatFactory: FormatFactory, splitColumnAccessor?: string | ExpressionValueVisDimension, splitRowAccessor?: string | ExpressionValueVisDimension) => DatatablesWithFormatInfo;
export declare const getSeriesName: GetSeriesNameFn;
export declare const generateSeriesId: ({ layerId }: Pick<CommonXYDataLayerConfig, "layerId">, splitColumnIds: string[], accessor?: string, xColumnId?: string) => string;
export declare const getMetaFromSeriesId: (seriesId: string) => {
    layerId: string;
    xAccessor: string | undefined;
    yAccessors: string[];
    splitAccessor: string[] | undefined;
};
export declare function hasMultipleLayersWithSplits(layers: CommonXYLayerConfig[]): boolean;
export declare const getSeriesProps: GetSeriesPropsFn;
export {};
