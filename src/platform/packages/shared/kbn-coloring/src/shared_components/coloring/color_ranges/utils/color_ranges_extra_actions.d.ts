import type { PaletteContinuity, DataBounds, CustomPaletteParams } from '../../../../palettes';
import type { ColorRange } from '../types';
/**
 * Distribute equally
 * @internal
 */
export declare const distributeEqually: (colorRanges: ColorRange[], rangeType: CustomPaletteParams["rangeType"], continuity: PaletteContinuity, dataBounds: DataBounds) => {
    color: string;
    start: number;
    end: number;
}[];
/**
 * Reverse Palette
 * @internal
 */
export declare const reversePalette: (colorRanges: ColorRange[]) => {
    color: string;
    start: number;
    end: number;
}[];
