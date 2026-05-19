import type { DataBounds, CustomPaletteParams } from '../../../../palettes';
import type { ColorRange, ColorRangeAccessor } from '../types';
/**
 * Add new color range after the last item
 * @internal
 */
export declare const addColorRange: (colorRanges: ColorRange[], rangeType: CustomPaletteParams["rangeType"], dataBounds: DataBounds) => ColorRange[];
/**
 * Delete ColorRange
 * @internal
 */
export declare const deleteColorRange: (index: number, colorRanges: ColorRange[]) => ColorRange[];
/**
 * Update ColorRange value
 * @internal
 */
export declare const updateColorRangeValue: (index: number, value: string, accessor: ColorRangeAccessor, colorRanges: ColorRange[]) => ColorRange[];
/**
 * Update ColorRange color
 * @internal
 */
export declare const updateColorRangeColor: (index: number, color: string, colorRanges: ColorRange[]) => ColorRange[];
