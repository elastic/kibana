import type { Dispatch } from 'react';
import React from 'react';
import type { ColorRangesActions } from './types';
export interface ColorRangesExtraActionsProps {
    dispatch: Dispatch<ColorRangesActions>;
    shouldDisableAdd?: boolean;
    shouldDisableReverse?: boolean;
    shouldDisableDistribute?: boolean;
}
export declare function ColorRangesExtraActions({ dispatch, shouldDisableAdd, shouldDisableReverse, shouldDisableDistribute, }: ColorRangesExtraActionsProps): React.JSX.Element;
