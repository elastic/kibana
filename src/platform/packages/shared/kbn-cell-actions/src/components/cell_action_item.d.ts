import React from 'react';
import type { CellAction, CellActionExecutionContext } from '../types';
export declare const ActionItem: ({ action, actionContext, showTooltip, onClick, }: {
    action: CellAction;
    actionContext: CellActionExecutionContext;
    showTooltip: boolean;
    onClick?: () => void;
}) => React.JSX.Element | null;
