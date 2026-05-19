import React from 'react';
import type { KbnPalettes } from '@kbn/palettes';
import type { ColorMapping } from '../../config';
export declare function RGBPicker({ color, palettes, selectColor, }: {
    color: ColorMapping.CategoricalColor | ColorMapping.ColorCode;
    palettes: KbnPalettes;
    selectColor: (color: ColorMapping.CategoricalColor | ColorMapping.ColorCode) => void;
}): React.JSX.Element;
