import React from 'react';
import type { IKbnPalette } from '@kbn/palettes';
import type { ColorMapping } from '../../config';
export declare function AddStop({ colorMode, currentPalette, at, }: {
    colorMode: ColorMapping.GradientColorMode;
    currentPalette: IKbnPalette;
    at: number;
}): React.JSX.Element;
