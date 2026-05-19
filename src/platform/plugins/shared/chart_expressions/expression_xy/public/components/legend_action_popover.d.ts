import React from 'react';
import type { CellValueAction } from '../types';
export type LegendCellValueActions = Array<Omit<CellValueAction, 'execute'> & {
    execute: () => void;
}>;
export interface LegendActionPopoverProps {
    /**
     * Determines the panels label
     */
    label: string;
    /**
     * Callback on filter value
     */
    onFilter: (param?: {
        negate?: boolean;
    }) => void;
    /**
     * Compatible actions to be added to the popover actions
     */
    legendCellValueActions?: LegendCellValueActions;
}
export declare const LegendActionPopover: React.FunctionComponent<LegendActionPopoverProps>;
