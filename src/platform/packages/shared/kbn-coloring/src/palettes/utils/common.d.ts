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
 * Returns color stops for given palette type:
 *
 * - custom - User has modified the stops in some way - return stops as is
 * - non-custom - Default palette stops - Return new stops based on palette
 *
 * > This is needed for BWC when switching between kibana themes.
 */
export declare function getOverridePaletteStops<T extends PaletteOutput<CustomPaletteParams>>(paletteService: PaletteRegistry, activePalette?: T): ColorStop[] | undefined;
export declare const hasPaletteStops: (palette?: PaletteOutput<{
    stops?: ColorStop[] | number[];
}>) => boolean;
