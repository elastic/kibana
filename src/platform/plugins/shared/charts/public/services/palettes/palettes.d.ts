import type { PaletteDefinition } from '@kbn/coloring';
import type { CoreTheme } from '@kbn/core/public';
export declare const COMPATIBILITY_PALETTE_ID = "kibana_palette";
export declare const buildPalettes: (theme: CoreTheme) => Record<string, PaletteDefinition>;
