import React from 'react';
import type { IKbnPalette, KbnPalettes } from '@kbn/palettes';
import type { ColorMapping } from '../../config';
interface ColorPickerSwatchProps {
    colorMode: ColorMapping.Config['colorMode'];
    assignmentColor: ColorMapping.Assignment['color'];
    index: number;
    total: number;
    palette: IKbnPalette;
    palettes: KbnPalettes;
    onColorChange: (color: ColorMapping.CategoricalColor | ColorMapping.ColorCode) => void;
    swatchShape: 'square' | 'round';
    isDarkMode: boolean;
    forType: 'assignment' | 'specialAssignment' | 'gradient';
}
export declare const ColorSwatch: ({ colorMode, assignmentColor, index, total, palette, palettes, onColorChange, swatchShape, isDarkMode, forType, }: ColorPickerSwatchProps) => React.JSX.Element;
export {};
