import React, { type CSSProperties } from 'react';
import { type Row } from '@tanstack/react-table';
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual';
import type { GroupNode } from '../../../store_provider';
import { type ChildVirtualizerController } from './child_virtualizer_controller';
type UseVirtualizerOptions = Parameters<typeof useVirtualizer>[0];
type UseVirtualizerReturnType = ReturnType<typeof useVirtualizer>;
export type { ChildVirtualizerController, UseVirtualizerReturnType };
export interface CascadeVirtualizerProps<G extends GroupNode> extends Pick<UseVirtualizerOptions, 'getScrollElement' | 'overscan' | 'initialOffset' | 'initialRect' | 'scrollMargin' | 'observeElementOffset' | 'observeElementRect'> {
    rows: Row<G>[];
    /**
     * setting a value of true causes the active group root row
     * to stick right under the header
     */
    enableStickyGroupHeader: boolean;
    estimatedRowHeight?: number;
    initialAnchorItemIndex?: number;
    /**
     * When true (default), creates a {@link ChildVirtualizerController}
     * that child virtualizers can connect to. Set to false when this
     * virtualizer is itself a child managed by a controller.
     */
    isRoot?: boolean;
    /**
     * Called whenever the virtualizer updates (scroll, range, size, etc.).
     * Used to conduit values into external state (e.g. public API store).
     *
     * @param didStabilize - true once post-measurement corrections have converged.
     *   Until then, scroll offset and derived values (e.g. anchor indices) may be
     *   intermediate and should not be persisted.
     */
    onStateChange?: (instance: UseVirtualizerReturnType, didRestoreScrollPosition: boolean, didStabilize: boolean) => void;
    /**
     * Pre-seeds persisted scroll anchors into the child virtualizer controller
     * so that children can restore their scroll positions on remount.
     * Only meaningful when {@link isRoot} is true.
     */
    initialPersistedAnchors?: Record<string, number | null>;
}
export interface UseVirtualizedRowScrollStateStoreOptions {
    /**
     * Function to get the parent virtualizer instance
     */
    getVirtualizer: () => ReturnType<typeof useCascadeVirtualizer>;
    /**
     * The index of the current row in the parent virtualizer
     */
    rowIndex: number;
}
export interface VirtualizedRowScrollState {
    scrollOffset: number;
    scrollMargin: number;
}
export interface VirtualizedCascadeListProps<G extends GroupNode> extends Pick<CascadeVirtualizerReturnValue, 'virtualizedRowComputedTranslateValue' | 'getVirtualItems'> {
    rows: Row<G>[];
    activeStickyIndex: number | null;
    listItemRenderer: (props: {
        isActiveSticky: boolean;
        virtualItem: VirtualItem;
        virtualRowStyle: React.CSSProperties;
        row: Row<G>;
    }) => React.ReactNode;
}
/**
 * Calculates the active sticky index from the current visible range.
 * Idea here is to find the nearest expanded parent index
 * and add the index of the current row to the range of visible items rendered to the user.
 * This should be called directly in the consuming component to ensure the value
 * is always current and never stale due to intermediate memoization.
 */
export declare function calculateActiveStickyIndex<G extends GroupNode>(rows: Row<G>[], startIndex: number, enableStickyGroupHeader: boolean): number | null;
export interface CascadeVirtualizerReturnValue extends Pick<UseVirtualizerReturnType, 'getTotalSize' | 'getVirtualItems' | 'isScrolling' | 'measureElement' | 'scrollOffset' | 'scrollElement' | 'range' | 'measurementsCache' | 'calculateRange'> {
    virtualizedRowComputedTranslateValue: Map<number, number>;
    virtualizedRowsSizeCache: Map<string, number>;
    scrollToVirtualizedIndex: (offset: number, options: {
        adjustments?: number;
        behavior?: Exclude<ScrollBehavior, 'instant'>;
    }) => void;
    scrollToLastVirtualizedRow: () => void;
    childController: ChildVirtualizerController | null;
    isStable: boolean;
}
/**
 * Narrowed return type for {@link useCascadeVirtualizer} when `isRoot` is `true`.
 * Guarantees that `childController` is always defined.
 */
export type CascadeRootVirtualizerReturnValue = Omit<CascadeVirtualizerReturnValue, 'childController'> & {
    childController: ChildVirtualizerController;
};
interface UseCascadeVirtualizer {
    <G extends GroupNode>(props: Omit<CascadeVirtualizerProps<G>, 'isRoot'> & {
        isRoot: true;
    }): CascadeRootVirtualizerReturnValue;
    <G extends GroupNode>(props: CascadeVirtualizerProps<G>): CascadeVirtualizerReturnValue;
}
export interface VirtualizerRangeExtractorArgs<G extends GroupNode> {
    rows: Row<G>[];
    enableStickyGroupHeader: boolean;
}
/**
 * @internal
 * @description custom range extractor for cascade component, used to modify the range items the virtualizer displays,
 * we leverage it in this case to include group rows we'd like to render as sticky headings.
 * see {@link https://tanstack.com/virtual/v3/docs/api/virtualizer#rangeextractor} for more details
 */
export declare const useCascadeVirtualizerRangeExtractor: <G extends GroupNode>({ rows, enableStickyGroupHeader, }: VirtualizerRangeExtractorArgs<G>) => (range: import("@tanstack/virtual-core").Range) => Array<number>;
/**
 * @internal
 * Anchors the scroll position of the virtualizer to the given item index on initial render.
 *
 * The hook watches `virtualizer.options.count` so that it re-fires when a
 * child virtualizer transitions from 0 items (inactive) to N items (active).
 * Without this, the `useLayoutEffect` would not re-run because the virtualizer
 * instance is a stable mutable reference.
 *
 * Post-measurement corrections run in a `requestAnimationFrame` loop that is
 * decoupled from React's render cycle. This avoids wasting correction budget
 * on unrelated re-renders and eliminates feedback loops between corrections
 * and tanstack's `onChange` callback.
 */
export declare const useAnchorVirtualizerToItemIndex: (virtualizer: UseVirtualizerReturnType, itemIndex: number, options?: {
    hasRestoredScrollPositionRef?: React.MutableRefObject<boolean>;
    hasStabilizedRef?: React.MutableRefObject<boolean>;
    skipCorrections?: boolean;
}) => void;
export declare const useCascadeVirtualizer: UseCascadeVirtualizer;
export declare const getGridRowPositioningStyle: (renderIndex: number, virtualizedRowComputedTranslateValueMap: Map<number, number>, visibleRowCount: number) => CSSProperties;
export declare function VirtualizedCascadeRowList<G extends GroupNode>({ activeStickyIndex, getVirtualItems, virtualizedRowComputedTranslateValue, rows, listItemRenderer, }: VirtualizedCascadeListProps<G>): React.JSX.Element[];
