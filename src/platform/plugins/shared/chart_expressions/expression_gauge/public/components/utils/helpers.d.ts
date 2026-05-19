import type { PaletteOutput } from '@kbn/coloring';
import type { CustomPaletteState } from '@kbn/charts-plugin/public';
export declare const computeMinMax: (paletteConfig: PaletteOutput<CustomPaletteState>, bands: number[]) => {
    min: number;
    max: number;
};
