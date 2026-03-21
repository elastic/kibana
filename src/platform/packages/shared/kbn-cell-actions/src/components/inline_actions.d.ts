import React from 'react';
import { type EuiButtonIconProps } from '@elastic/eui';
import type { CellActionExecutionContext } from '../types';
interface InlineActionsProps {
    actionContext: CellActionExecutionContext;
    anchorPosition: 'rightCenter' | 'downCenter';
    showActionTooltips: boolean;
    visibleCellActions: number;
    disabledActionTypes: string[];
    extraActionsIconType?: EuiButtonIconProps['iconType'];
    extraActionsColor?: EuiButtonIconProps['color'];
}
export declare const InlineActions: React.FC<InlineActionsProps>;
export {};
