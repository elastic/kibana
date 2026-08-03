import type { Dispatch } from 'react';
import React from 'react';
import type { EuiIconProps } from '@elastic/eui';
import type { PaletteContinuity, CustomPaletteParams } from '../../../palettes';
import type { ColorRangesActions, ColorRange, ColorRangeAccessor } from './types';
export interface ColorRangesItemButtonProps {
    index: number;
    colorRanges: ColorRange[];
    rangeType: CustomPaletteParams['rangeType'];
    continuity: PaletteContinuity;
    dispatch: Dispatch<ColorRangesActions>;
    accessor: ColorRangeAccessor;
    tooltipContent: string;
    iconFactory: (props: Omit<EuiIconProps, 'type'>) => JSX.Element;
}
export declare function ColorRangeDeleteButton({ index, dispatch }: ColorRangesItemButtonProps): React.JSX.Element;
export declare function ColorRangeEditButton({ index, continuity, dispatch, accessor, }: ColorRangesItemButtonProps): React.JSX.Element;
export declare function ColorRangeAutoDetectButton({ continuity, dispatch, accessor, tooltipContent, iconFactory, }: ColorRangesItemButtonProps): React.JSX.Element;
