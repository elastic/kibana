import { type EuiButtonIconProps } from '@elastic/eui';
import React from 'react';
import type { CellAction, CellActionExecutionContext } from '../types';
interface ActionsPopOverProps {
    anchorPosition: 'rightCenter' | 'downCenter';
    actionContext: CellActionExecutionContext;
    isOpen: boolean;
    closePopOver: () => void;
    actions: CellAction[];
    button: JSX.Element;
    extraActionsColor?: EuiButtonIconProps['color'];
}
export declare const ExtraActionsPopOver: React.FC<ActionsPopOverProps>;
interface ExtraActionsPopOverWithAnchorProps extends Pick<ActionsPopOverProps, 'anchorPosition' | 'actionContext' | 'closePopOver' | 'isOpen' | 'actions' | 'extraActionsColor'> {
    anchorRef: React.RefObject<HTMLElement>;
}
export declare const ExtraActionsPopOverWithAnchor: ({ anchorPosition, anchorRef, actionContext, isOpen, closePopOver, actions, extraActionsColor, }: ExtraActionsPopOverWithAnchorProps) => React.JSX.Element | null;
export {};
