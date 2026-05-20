import type { Row } from '@tanstack/react-table';
import type { GroupNode } from '../../../store_provider';
import type { ChildConnectionHandle, ChildVirtualizerController } from './child_virtualizer_controller';
import { type CascadeVirtualizerReturnValue } from '.';
export interface UseConnectedChildVirtualizerOptions<G extends GroupNode> {
    controller: ChildVirtualizerController;
    cellId: string;
    rowIndex: number;
    rows: Row<G>[];
    estimatedRowHeight?: number;
    overscan?: number;
    /**
     * When detached, the child uses this element as its own scroll container.
     * If not provided, the child cannot detach.
     */
    privateScrollElement?: React.RefObject<Element | null>;
}
export interface UseConnectedChildVirtualizerResult {
    virtualizer: CascadeVirtualizerReturnValue;
    handle: ChildConnectionHandle;
    isActive: boolean;
    isDetached: boolean;
}
export declare const useConnectedChildVirtualizer: <G extends GroupNode>({ controller, cellId, rowIndex, rows, estimatedRowHeight, overscan, privateScrollElement, }: UseConnectedChildVirtualizerOptions<G>) => UseConnectedChildVirtualizerResult;
