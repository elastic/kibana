import { type EuiButtonIconProps } from '@elastic/eui';
import React from 'react';
import type { CellActionExecutionContext } from '../types';
/** This class is added to the document body while dragging */
export declare const IS_DRAGGING_CLASS_NAME = "is-dragging";
interface Props {
    anchorPosition: 'downCenter' | 'rightCenter';
    children: React.ReactNode;
    visibleCellActions: number;
    actionContext: CellActionExecutionContext;
    showActionTooltips: boolean;
    disabledActionTypes: string[];
    extraActionsIconType?: EuiButtonIconProps['iconType'];
    extraActionsColor?: EuiButtonIconProps['color'];
}
export declare const HoverActionsPopover: React.FC<Props>;
export {};
