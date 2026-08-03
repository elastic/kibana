import React from 'react';
import type { CellValueAction } from '../types';
export type LegendCellValueActions = Array<Omit<CellValueAction, 'execute'> & {
    execute: () => void;
    disabled?: boolean;
}>;
export declare const LegendActionPopover: React.FunctionComponent<{
    /** Determines the panels label. */
    label: string;
    /** Callback on filter value. */
    onFilter: (param?: {
        negate?: boolean;
    }) => void;
    /** Compatible actions to be added to the popover actions. */
    legendCellValueActions?: LegendCellValueActions;
    /** When true, built-in Filter for / Filter out items are shown as disabled. */
    showDisabledFilterActions?: boolean;
    /** Warning message rendered below the disabled filter actions. */
    footerMessage?: string;
}>;
