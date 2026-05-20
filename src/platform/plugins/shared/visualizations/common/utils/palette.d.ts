import type { ColorSchemas } from '@kbn/charts-plugin/common';
import type { Range } from '@kbn/expressions-plugin/common';
export interface PaletteConfig {
    color: Array<string | undefined>;
    stop: number[];
}
export declare const getStopsWithColorsFromRanges: (ranges: Range[], colorSchema: ColorSchemas, invertColors?: boolean) => PaletteConfig;
