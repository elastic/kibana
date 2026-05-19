import React from 'react';
import type { KbnPaletteId, KbnPalettes } from '@kbn/palettes';
import type { ColorMapping } from '../../config';
export declare function Gradient({ paletteId, colorMode, isDarkMode, palettes, }: {
    paletteId: KbnPaletteId;
    isDarkMode: boolean;
    colorMode: ColorMapping.Config['colorMode'];
    palettes: KbnPalettes;
}): React.JSX.Element | null;
