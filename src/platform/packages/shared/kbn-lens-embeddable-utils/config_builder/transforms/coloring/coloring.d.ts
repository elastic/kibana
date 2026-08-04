import type { ColorMapping, CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import type { AllColoringTypes, AutoColorType, ColorByValueAbsolute, ColorByValuePaletteType, ColorByValueType, ColorMappingType, NoColorType, StaticColorType } from '../../schema/color';
export { NO_COLOR, AUTO_COLOR, DEFAULT_CATEGORICAL_COLOR_MAPPING } from '../../schema/color';
export declare const LEGACY_PALETTE_PREFIX = "LEGACY_PALETTE_";
export declare function isLegacyColorPalette(color: {
    colorMapping: ColorMapping.Config;
} | {
    palette: PaletteOutput;
} | undefined): color is {
    palette: PaletteOutput;
};
export declare function getContinuity(rangeMin: number | null, rangeMax: number | null): 'all' | 'above' | 'below' | 'none';
/**
 * API -> Lens state entry point for color by value. Routes on the config `type`:
 * - `distributed_palette` / `legacy_dynamic` -> a named palette whose bands are owned by the
 *   palette service (`numberOfBands` and `useNumericRange` configure the band count and range).
 * - `dynamic` -> a `custom` palette with explicit per-band `stops`/`colorStops` and numeric
 *   `rangeMin`/`rangeMax` derived from the steps; `numberOfBands`/`useNumericRange` do not apply.
 */
export declare function fromColorByValueAPIToLensState(config?: ColorByValueType, numberOfBands?: number, useNumericRange?: boolean): PaletteOutput<CustomPaletteParams> | undefined;
export declare function getRangeValue(value?: number | null): number | null;
/**
 * Lens state -> API for color by value; inverse of {@link fromColorByValueAPIToLensState}.
 * - A named (non-custom) palette becomes a `distributed_palette`: per-band stops are dropped
 *   since the palette service owns the band distribution.
 * - A custom palette becomes a `dynamic` config, rematerializing each stop as a
 *   `{ gte, lt | lte, color }` step and applying `reverse` to the stop colors first.
 */
export declare function fromColorByValueLensStateToAPI(config: PaletteOutput<CustomPaletteParams> | undefined): ColorByValueType | undefined;
export declare function fromStaticColorLensStateToAPI(color: string | undefined): StaticColorType | undefined;
export declare function fromStaticColorAPIToLensState(color: StaticColorType | undefined): {
    color: string;
} | undefined;
export declare function fromColorMappingLensStateToAPI(colorMapping: ColorMapping.Config | undefined, legacyPalette?: PaletteOutput): ColorMappingType | undefined;
export declare function fromColorMappingAPIToLensState(colorMapping: ColorMappingType | undefined): {
    colorMapping: ColorMapping.Config;
} | {
    palette: PaletteOutput;
} | undefined;
export declare function isColorByValueColor(color?: AllColoringTypes): color is ColorByValueType;
export declare function isColorByValuePalette(color?: AllColoringTypes): color is ColorByValuePaletteType;
export declare function isColorByValueAbsolute(color?: AllColoringTypes): color is ColorByValueAbsolute;
export declare function isColorMappingColor(color?: AllColoringTypes): color is ColorMappingType;
export declare function isNoColor(color?: AllColoringTypes): color is NoColorType;
export declare function isAutoColor(color?: AllColoringTypes): color is AutoColorType;
