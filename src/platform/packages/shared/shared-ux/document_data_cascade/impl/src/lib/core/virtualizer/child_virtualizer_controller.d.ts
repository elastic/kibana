import type { CascadeVirtualizerReturnValue } from '.';
export interface ChildVirtualizerConfig {
    getScrollElement: () => Element | null;
    scrollMargin: number;
    initialOffset: number;
    initialAnchorItemIndex: number | null;
}
export interface ConnectedChildState {
    cellId: string;
    rowIndex: number;
    scrollOffset: number;
    range: {
        startIndex: number;
        endIndex: number;
    } | null;
    totalSize: number;
    totalItemCount: number;
    scrollAnchorItemIndex: number | null;
    isDetached: boolean;
    hasStabilized: boolean;
}
export interface ChildConnectionHandle {
    reportState(state: Partial<ConnectedChildState>): void;
    detachScrollElement(): void;
    reattachScrollElement(): void;
    disconnect(): void;
}
export interface ChildVirtualizerController {
    /**
     * Lightweight registration that makes the scheduler aware of a row cell
     * before the full child component mounts. Returns a function to "dequeue" the cell.
     */
    enqueue(cellId: string, rowIndex: number): () => void;
    /**
     * Returns true if the cell has a persisted anchor, meaning it was previously
     * connected and is now remounting. Allows the cell to bypass the skeleton on
     * its very first render, before effects fire.
     */
    isReturningCell(cellId: string): boolean;
    getChildConfig(rowIndex: number): ChildVirtualizerConfig;
    /**
     * Returns the current start position of a root row from the root
     * virtualizer's measurements. Unlike the memoized config, this always
     * reflects the latest measurements, keeping child virtualizers in sync
     * when the root remeasures items above them.
     */
    getScrollMarginForRow(rowIndex: number): number;
    connect(cellId: string, rowIndex: number): ChildConnectionHandle;
    getConnectedChildren(): ReadonlyMap<string, ConnectedChildState>;
    shouldActivate(rowIndex: number): boolean;
    readonly isRootStable: boolean;
    markRootStable(): void;
    subscribe(listener: () => void): () => void;
    getPersistedAnchor(cellId: string): number | null;
    /**
     * Removes a persisted anchor for a cell. Called when a row collapses so that
     * re-expanding goes through the normal stagger/skeleton path.
     */
    clearPersistedAnchor(cellId: string): void;
    /**
     * Returns true when at least one connected (non-detached) child has a
     * persisted scroll anchor. Used by the root virtualizer to decide whether
     * to yield post-measurement corrections to a child.
     */
    hasConnectedChildWithPersistedAnchor(): boolean;
    /**
     * Returns true when every child that had an initial persisted anchor has
     * reported `hasStabilized: true`. Trivially true when no persisted anchors
     * existed at creation time.
     */
    haveAllRestoringChildrenStabilized(): boolean;
    destroy(): void;
}
export interface CreateChildVirtualizerControllerOptions {
    getRootVirtualizer: () => CascadeVirtualizerReturnValue | undefined;
    activationBudget?: number;
    initialPersistedAnchors?: Record<string, number | null>;
}
export declare const createChildVirtualizerController: ({ getRootVirtualizer, activationBudget, initialPersistedAnchors, }: CreateChildVirtualizerControllerOptions) => ChildVirtualizerController;
