import type { ColumnState, GenericIndexPatternColumn, TextBasedLayerColumn, DataType } from '@kbn/lens-common';
import type { AutoColorType, ColorByValueType, ColorMappingType } from '../../../schema/color';
type ApiColorTarget = 'value' | 'badge' | 'background';
export declare const colorModeToApplyColorTo: (mode: Exclude<NonNullable<ColumnState["colorMode"]>, "none">) => ApiColorTarget;
export declare const applyColorToToColorMode: (target: ApiColorTarget) => NonNullable<ColumnState["colorMode"]>;
/**
 * Checks if the column is a metric column in a formBased layer
 * - In metric columns the isMetric property is not set in all cases and neither is for rows
 * - Pass layerColumn to check isBucketed property
 */
export declare function isMetricColumnNoESQL(col: ColumnState, layerColumn: GenericIndexPatternColumn): boolean;
/**
 * Checks if the column is a metric column in a textBased layer
 */
export declare function isMetricColumnESQL(col: ColumnState, layerColumns: TextBasedLayerColumn[]): boolean;
export declare function getAccessorName(type: 'metric' | 'row' | 'split_metric_by' | 'metric_ref', index?: number): string;
/**
 * Infers the datatype from the color configuration.
 * - colorMapping → 'string'
 * - colorByValue → 'number'
 * - No color → uses the provided default
 */
export declare function inferDatatypeFromColor(color: ColorByValueType | ColorMappingType | AutoColorType | undefined, defaultType: Extract<DataType, 'number' | 'string'>): Extract<DataType, 'number' | 'string'>;
export {};
