import type { DataBounds, PaletteOutput, PaletteRegistry, CustomPaletteParams } from '../../palettes';
import type { ColorRange } from './color_ranges';
import type { PaletteConfigurationState } from './types';
/**
 * Some name conventions here:
 * * `displayStops` => It's an additional transformation of `stops` into a [0, N] domain for the EUIPaletteDisplay component.
 * * `stops` => final steps used to table coloring. It is a rightShift of the colorStops
 * * `colorStops` => user's color stop inputs.  Used to compute range min.
 *
 * When the user inputs the colorStops, they are designed to be the initial part of the color segment,
 * so the next stops indicate where the previous stop ends.
 * Both table coloring logic and EuiPaletteDisplay format implementation works differently than our current `colorStops`,
 * by having the stop values at the end of each color segment rather than at the beginning: `stops` values are computed by a rightShift of `colorStops`.
 * EuiPaletteDisplay has an additional requirement as it is always mapped against a domain [0, N]: from `stops` the `displayStops` are computed with
 * some continuity enrichment and a remap against a [0, 100] domain to make the palette component work ok.
 *
 * These naming conventions would be useful to track the code flow in this feature as multiple transformations are happening
 * for a single change.
 */
export declare function updateRangeType(newRangeType: CustomPaletteParams['rangeType'], activePalette: PaletteConfigurationState['activePalette'], dataBounds: DataBounds, palettes: PaletteRegistry, colorRanges: PaletteConfigurationState['colorRanges']): CustomPaletteParams;
export declare function changeColorPalette(newPalette: PaletteConfigurationState['activePalette'], activePalette: PaletteConfigurationState['activePalette'], palettes: PaletteRegistry, dataBounds: DataBounds, disableSwitchingContinuity: boolean): {
    params: {
        stops: {
            stop: number;
            color: string;
        }[];
        rangeMin: number;
        rangeMax: number;
        name?: string;
        reverse?: boolean;
        rangeType?: "number" | "percent";
        continuity?: import("../../palettes").PaletteContinuity;
        progression?: "fixed";
        colorStops?: import("../../palettes").ColorStop[];
        steps?: number;
        maxSteps?: number;
    };
    type: "palette" | "system_palette";
    name: string;
};
export declare function withUpdatingPalette(palettes: PaletteRegistry, activePalette: PaletteConfigurationState['activePalette'], colorRanges: ColorRange[], dataBounds: DataBounds, continuity?: CustomPaletteParams['continuity']): {
    activePalette: PaletteOutput<CustomPaletteParams>;
    colorRanges: ColorRange[];
};
export declare function withUpdatingColorRanges(palettes: PaletteRegistry, activePalette: PaletteConfigurationState['activePalette'], dataBounds: DataBounds): {
    colorRanges: {
        color: string;
        start: number;
        end: number;
    }[];
    activePalette: PaletteOutput<CustomPaletteParams>;
};
export declare function getStopsFromColorRangesByNewInterval(colorRanges: ColorRange[], { newInterval, oldInterval, newMin, oldMin, }: {
    newInterval: number;
    oldInterval: number;
    newMin: number;
    oldMin: number;
}): {
    color: string;
    stop: number;
}[];
export declare function mergePaletteParams(activePalette: PaletteOutput<CustomPaletteParams>, newParams: CustomPaletteParams): PaletteOutput<CustomPaletteParams>;
export declare function getColorStops(palettes: PaletteRegistry, colorStops: Required<CustomPaletteParams>['stops'], activePalette: PaletteOutput<CustomPaletteParams>, dataBounds: DataBounds): import("../../palettes").ColorStop[];
/**
 * Both table coloring logic and EuiPaletteDisplay format implementation works differently than our current `colorStops`,
 * by having the stop values at the end of each color segment rather than at the beginning: `stops` values are computed by a rightShift of `colorStops`.
 * EuiPaletteDisplay has an additional requirement as it is always mapped against a domain [0, N]: from `stops` the `displayStops` are computed with
 * some continuity enrichment and a remap against a [0, 100] domain to make the palette component work ok.
 *
 * These naming conventions would be useful to track the code flow in this feature as multiple transformations are happening
 * for a single change.
 */
export declare function toColorRanges(palettes: PaletteRegistry, colorStops: CustomPaletteParams['colorStops'], activePalette: PaletteOutput<CustomPaletteParams>, dataBounds: DataBounds): {
    color: string;
    start: number;
    end: number;
}[];
