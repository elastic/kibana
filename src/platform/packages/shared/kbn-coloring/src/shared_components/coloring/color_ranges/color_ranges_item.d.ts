import type { Dispatch } from 'react';
import React from 'react';
import type { PaletteContinuity, CustomPaletteParams } from '../../../palettes';
import type { ColorRange, ColorRangeAccessor, ColorRangesActions } from './types';
import type { ColorRangeValidation } from './color_ranges_validation';
export interface ColorRangesItemProps {
    colorRange: ColorRange;
    index: number;
    colorRanges: ColorRange[];
    dispatch: Dispatch<ColorRangesActions>;
    rangeType: CustomPaletteParams['rangeType'];
    continuity: PaletteContinuity;
    accessor: ColorRangeAccessor;
    validation?: ColorRangeValidation;
}
export declare function ColorRangeItem({ accessor, index, colorRange, rangeType, colorRanges, validation, continuity, dispatch, }: ColorRangesItemProps): React.JSX.Element;
