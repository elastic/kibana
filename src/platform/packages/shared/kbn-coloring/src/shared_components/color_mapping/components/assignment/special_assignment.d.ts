import React from 'react';
import type { IKbnPalette, KbnPalettes } from '@kbn/palettes';
import type { ColorCode, CategoricalColor } from '../../config/types';
export declare function SpecialAssignment({ assignmentColor, index, palette, palettes, isDarkMode, total, }: {
    isDarkMode: boolean;
    index: number;
    assignmentColor: CategoricalColor | ColorCode;
    palette: IKbnPalette;
    palettes: KbnPalettes;
    total: number;
}): React.JSX.Element;
