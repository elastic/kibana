import type { KbnPaletteId, KbnPalettes } from '@kbn/palettes';
import type { ColorMapping } from '.';
export declare function updateAssignmentsPalette(assignments: ColorMapping.Config['assignments'], colorMode: ColorMapping.Config['colorMode'], paletteId: KbnPaletteId, palettes: KbnPalettes, preserveColorChanges: boolean): ColorMapping.Config['assignments'];
export declare function updateColorModePalette(colorMode: ColorMapping.Config['colorMode'], paletteId: KbnPaletteId, preserveColorChanges: boolean): ColorMapping.Config['colorMode'];
