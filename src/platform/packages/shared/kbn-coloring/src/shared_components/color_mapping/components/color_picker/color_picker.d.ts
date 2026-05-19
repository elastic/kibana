import React from 'react';
import type { IKbnPalette, KbnPalettes } from '@kbn/palettes';
import type { ColorMapping } from '../../config';
export declare function ColorPicker({ color, palette, palettes, close, selectColor, deleteStep, }: {
    color: ColorMapping.CategoricalColor | ColorMapping.ColorCode;
    palette: IKbnPalette;
    palettes: KbnPalettes;
    close: () => void;
    selectColor: (color: ColorMapping.CategoricalColor | ColorMapping.ColorCode) => void;
    deleteStep?: () => void;
}): React.JSX.Element;
