import type { KbnPaletteId, KbnPalettes } from '@kbn/palettes';
import type { ColorMapping } from '../../shared_components';
/**
 * Returns color mapping config from a `KbnPalette`
 *
 * Converts gradients to their equivalent color mapping config
 */
export declare function getConfigFromPalette(palettes: KbnPalettes, paletteId: KbnPaletteId): ColorMapping.Config;
