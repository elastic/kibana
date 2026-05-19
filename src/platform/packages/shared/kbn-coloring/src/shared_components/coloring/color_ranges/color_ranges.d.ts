import type { Dispatch } from 'react';
import React from 'react';
import type { CustomPaletteParams } from '../../../palettes';
import type { ColorRange } from './types';
import type { PaletteConfigurationActions } from '../types';
export interface ColorRangesProps {
    colorRanges: ColorRange[];
    paletteConfiguration: CustomPaletteParams | undefined;
    showExtraActions: boolean;
    dispatch: Dispatch<PaletteConfigurationActions>;
}
export declare function ColorRanges({ colorRanges, paletteConfiguration, showExtraActions, dispatch, }: ColorRangesProps): React.JSX.Element;
