import { type Row } from '../table';
import type { CascadeVirtualizerReturnValue } from '../virtualizer';
import type { GroupNode } from '../../../store_provider';
/**
 * Helper hook to get the ARIA attributes for the tree grid container to ensure a proper accessibility tree gets generated,
 * see {@link https://www.w3.org/WAI/ARIA/apg/patterns/treegrid/#wai-ariaroles,states,andproperties | TreeGrid WAI ARIA spec}
 */
export declare function useTreeGridContainerARIAAttributes(labelId: string): {
    role: string;
    'aria-readonly': boolean;
    'aria-multiselectable': boolean;
    'aria-rowcount': number;
    'aria-labelledby': string;
};
/**
 * Helper hook to get the required ARIA props for tree grid rows to ensure a proper accessibility tree gets generated,
 * see {@link https://www.w3.org/WAI/ARIA/apg/patterns/treegrid/#wai-ariaroles,states,andproperties | TreeGrid WAI ARIA spec}
 */
export declare function useTreeGridRowARIAAttributes<G extends GroupNode>({ rowInstance, virtualRowIndex, }: {
    rowInstance: Row<G>;
    virtualRowIndex: number;
}): {
    'aria-owns'?: string | undefined;
    id: string;
    role: string;
    tabIndex: number;
    'aria-rowindex': number;
    'aria-expanded': boolean;
    'aria-level': number;
    'aria-setsize': number;
    'aria-posinset': number;
};
/**
 * Utility hook to register accessibility helpers for the data cascade,
 * see {@link https://www.w3.org/WAI/ARIA/apg/patterns/treegrid/#keyboardinteraction | treegrid keyboard interaction}
 */
export declare function useRegisterCascadeAccessibilityHelpers<G extends GroupNode>({ tableRows, tableWrapperElement, scrollToRowIndex, }: {
    tableRows: Row<G>[];
    tableWrapperElement: HTMLElement | null;
    scrollToRowIndex: CascadeVirtualizerReturnValue['scrollToVirtualizedIndex'];
}): void;
