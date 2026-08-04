import React from 'react';
import type { IKbnPalette, KbnPalettes } from '@kbn/palettes';
import type { ColorMapping } from '../../config';
export declare function PaletteColors({ palette, palettes, color, selectColor, }: {
    palette: IKbnPalette;
    palettes: KbnPalettes;
    color: ColorMapping.CategoricalColor | ColorMapping.ColorCode;
    selectColor: (color: ColorMapping.CategoricalColor | ColorMapping.ColorCode) => void;
}): React.JSX.Element;
