import type { FieldFormat, FormatFactory, SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import type { ExpressionValueVisDimension } from '@kbn/chart-expressions-common';
import type { CommonXYDataLayerConfig, CommonXYLayerConfig, ReferenceLineLayerConfig } from '../../common/types';
import type { GroupsConfiguration } from './axes_configuration';
interface CustomTitles {
    xTitle?: string;
    yTitle?: string;
    yRightTitle?: string;
}
interface SplitAccessors {
    splitColumnAccessor?: string | ExpressionValueVisDimension;
    splitRowAccessor?: string | ExpressionValueVisDimension;
}
export type AccessorsFieldFormats = Record<string, SerializedFieldFormat | undefined>;
export type SplitAccessorsFieldFormats = Record<string, {
    format: SerializedFieldFormat | undefined;
    formatter: FieldFormat;
}>;
export interface LayerFieldFormats {
    xAccessors: AccessorsFieldFormats;
    yAccessors: AccessorsFieldFormats;
    splitSeriesAccessors: SplitAccessorsFieldFormats;
    splitColumnAccessors: AccessorsFieldFormats;
    splitRowAccessors: AccessorsFieldFormats;
}
export type LayersFieldFormats = Record<string, LayerFieldFormats>;
export type AccessorsTitles = Record<string, string>;
export interface LayerAccessorsTitles {
    xTitles?: AccessorsTitles;
    yTitles?: AccessorsTitles;
    splitSeriesTitles?: AccessorsTitles;
    splitColumnTitles?: AccessorsTitles;
    splitRowTitles?: AccessorsTitles;
    markSizeTitles?: AccessorsTitles;
}
export type LayersAccessorsTitles = Record<string, LayerAccessorsTitles>;
export declare function getFilteredLayers(layers: CommonXYLayerConfig[]): (ReferenceLineLayerConfig | CommonXYDataLayerConfig)[];
export declare const getLayerFormats: ({ xAccessor, accessors, splitAccessors, table, isPercentage }: CommonXYDataLayerConfig, { splitColumnAccessor, splitRowAccessor }: SplitAccessors, formatFactory: FormatFactory) => LayerFieldFormats;
export declare const getLayersFormats: (layers: CommonXYDataLayerConfig[], splitAccessors: SplitAccessors, formatFactory: FormatFactory) => LayersFieldFormats;
export declare const getLayerTitles: ({ xAccessor, accessors, splitAccessors, table, layerId, markSizeAccessor, }: CommonXYDataLayerConfig, { splitColumnAccessor, splitRowAccessor }: SplitAccessors, { xTitle }: CustomTitles, groups: GroupsConfiguration) => LayerAccessorsTitles;
export declare const getLayersTitles: (layers: CommonXYDataLayerConfig[], splitAccessors: SplitAccessors, customTitles: CustomTitles, groups: GroupsConfiguration) => LayersAccessorsTitles;
export {};
