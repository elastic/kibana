import type { KbnPalettes } from '@kbn/palettes';
import type { ColorMapping } from '.';
export declare const DEFAULT_NEUTRAL_PALETTE_INDEX = 1;
export declare const DEFAULT_OTHER_ASSIGNMENT_INDEX = 0;
export declare const DEFAULT_OTHER_ASSIGNMENT: ColorMapping.AssignmentBase<ColorMapping.RuleOthers, ColorMapping.LoopColor>;
/**
 * The default color mapping used in Kibana, starts with the EUI color palette
 */
export declare const DEFAULT_COLOR_MAPPING_CONFIG: ColorMapping.Config;
export declare function getPaletteColors(palettes: KbnPalettes, colorMappings?: ColorMapping.Config): string[];
export declare function getPaletteColorsFromPaletteId(palettes: KbnPalettes, paletteId: ColorMapping.Config['paletteId']): string[];
export declare function getColorsFromMapping(palettes: KbnPalettes, isDarkMode: boolean, colorMappings?: ColorMapping.Config): string[];
