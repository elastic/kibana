import type { PaletteContinuity, PaletteRegistry, CustomPaletteParams, DataBounds, ColorStop, PaletteOutput } from '../types';
/** @internal **/
export declare function calculateStop(stopValue: number, newMin: number, oldMin: number, oldInterval: number, newInterval: number): number;
/**
 * This is a generic function to compute stops from the current parameters.
 */
export declare function getPaletteStops(palettes: PaletteRegistry, activePaletteParams: CustomPaletteParams, { prevPalette, dataBounds, mapFromMinValue, defaultPaletteName, }: {
    prevPalette?: string;
    dataBounds: DataBounds;
    mapFromMinValue?: boolean;
    defaultPaletteName?: string;
}): {
    stop: number;
    color: string;
}[];
export declare function remapStopsByNewInterval(controlStops: ColorStop[], { newInterval, oldInterval, newMin, oldMin, }: {
    newInterval: number;
    oldInterval: number;
    newMin: number;
    oldMin: number;
}): {
    color: string;
    stop: number;
}[];
export declare function shiftPalette(stops: ColorStop[], max: number): {
    stop: number;
    color: string;
}[];
export declare function roundValue(value: number, fractionDigits?: number): number;
export declare function getStepValue(colorStops: ColorStop[], newColorStops: ColorStop[], max: number): number;
export declare function getDataMinMax(rangeType: CustomPaletteParams['rangeType'] | undefined, dataBounds: DataBounds): {
    min: number;
    max: number;
};
export declare const checkIsMinContinuity: (continuity: PaletteContinuity | undefined) => boolean;
export declare const checkIsMaxContinuity: (continuity: PaletteContinuity | undefined) => boolean;
export declare const getFallbackDataBounds: (rangeType?: CustomPaletteParams["rangeType"]) => DataBounds;
export declare function reversePalette(paletteColorRepresentation?: ColorStop[]): {
    color: string;
    stop: number;
}[];
export declare function getActivePaletteName(name?: string): string;
export declare function applyPaletteParams<T extends PaletteOutput<CustomPaletteParams>>(palettes: PaletteRegistry, activePalette: T, dataBounds: DataBounds): {
    stop: number;
    color: string;
}[];
/**
 * Returns the render colors for a palette (overriding any stored colors so they follow the active
 * kibana theme):
 *
 * - custom: the user-defined stop colors, as-is.
 * - named (non-custom): a fresh N-color spectrum generated from the palette service, where N is
 *   driven by `steps`. Named palettes have no per-band positions — consumers distribute these
 *   colors uniformly across the live data domain — so only the colors are returned.
 *
 * > Regenerating the colors is what keeps charts correct when switching between kibana themes.
 */
export declare function getOverridePaletteColors<T extends PaletteOutput<CustomPaletteParams>>(paletteService: PaletteRegistry, activePalette?: T): string[] | undefined;
/**
 * Type guard distinguishing the two kinds of palette a chart/column can carry:
 * - color-by-value palette: carries `params` (custom stops or a named band spec) -> value-based
 * - legacy colorMapping (categorical) palette: name-only, no `params` -> not value-based
 */
export declare const isValueBasedPalette: <T = CustomPaletteParams>(palette?: PaletteOutput<T>) => palette is PaletteOutput<T>;
