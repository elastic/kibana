import type { ColorMapping, CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import type { AllColoringTypes, AutoColorType, ColorByValueAbsolute, ColorByValueType, ColorMappingType, NoColorType, StaticColorType } from '../../schema/color';
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
export declare function fromColorByValueAPIToLensState(config?: ColorByValueType): PaletteOutput<CustomPaletteParams> | undefined;
export declare function getRangeValue(value?: number | null): number | null;
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
export declare function isColorByValueAbsolute(color?: AllColoringTypes): color is ColorByValueAbsolute;
export declare function isColorMappingColor(color?: AllColoringTypes): color is ColorMappingType;
export declare function isNoColor(color?: AllColoringTypes): color is NoColorType;
export declare function isAutoColor(color?: AllColoringTypes): color is AutoColorType;
