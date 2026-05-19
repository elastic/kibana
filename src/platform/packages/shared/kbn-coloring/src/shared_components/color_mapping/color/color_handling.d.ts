import type { KbnPaletteId, KbnPalettes } from '@kbn/palettes';
import type { RawValue } from '@kbn/data-plugin/common';
import type { ColorMapping } from '../config';
import type { ColorMappingInputData } from '../categorical_color_mapping';
import type { GradientColorMode } from '../config/types';
export declare function getAssignmentColor(colorMode: ColorMapping.Config['colorMode'], color: ColorMapping.Assignment['color'] | (ColorMapping.LoopColor & {
    paletteId: KbnPaletteId;
    colorIndex: number;
}), palettes: KbnPalettes, isDarkMode: boolean, index: number, total: number): string;
export declare function getColor(color: ColorMapping.ColorCode | ColorMapping.CategoricalColor | (ColorMapping.LoopColor & {
    paletteId: KbnPaletteId;
    colorIndex: number;
}), palettes: KbnPalettes): string;
/**
 * Returns a color given a raw value
 */
export type ColorHandlingFn = (rawValue: RawValue) => string;
export declare function getColorFactory({ assignments, specialAssignments, colorMode, paletteId }: ColorMapping.Config, palettes: KbnPalettes, isDarkMode: boolean, data: ColorMappingInputData): ColorHandlingFn;
export declare function getGradientColorScale(colorMode: GradientColorMode, palettes: KbnPalettes, isDarkMode: boolean): (value: number) => string;
