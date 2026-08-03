import type { Range } from '@kbn/expressions-plugin/common';
import type { ColorSchemas } from '@kbn/charts-plugin/common';
export interface PaletteParams {
    colorSchema: ColorSchemas;
    colorsRange: Range[];
    invertColors: boolean;
}
export interface ExtendedPaletteParams extends PaletteParams {
    percentageMode: boolean;
}
