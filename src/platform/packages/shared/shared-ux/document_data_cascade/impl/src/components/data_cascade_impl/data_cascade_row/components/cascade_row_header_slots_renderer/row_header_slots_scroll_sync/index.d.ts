import React from 'react';
export interface RowHeaderSlotsScrollSyncState {
    isScrollable: boolean;
    canScrollLeft: boolean;
    canScrollRight: boolean;
}
interface RowHeaderSlotsScrollSyncContextValue {
    register: (el: HTMLDivElement) => void;
    unregister: (el: HTMLDivElement) => void;
    subscribe: (listener: () => void) => () => void;
    getSnapshot: () => RowHeaderSlotsScrollSyncState;
    notifyHover: (el: HTMLDivElement) => void;
    notifyHoverEnd: (el: HTMLDivElement) => void;
}
export declare const useRowHeaderSlotsScrollSync: () => RowHeaderSlotsScrollSyncContextValue;
/**
 * Co-ordinates the scroll position of multiple scrollable elements.
 *
 * Uses a single capture-phase scroll listener on a wrapper element to
 * intercept scroll events from all registered containers. Only the element
 * the user is actively scrolling (the "scroll leader") triggers sync;
 * programmatic scrollLeft writes on other containers are ignored via the
 * leader check, preventing the O(N) feedback cascade.
 *
 * Layout-expensive reads (scrollWidth, clientWidth) are cached and only
 * refreshed by the ResizeObserver, keeping the scroll hot path free of
 * forced style recalculations. All intermediate objects (scroll state,
 * scrollTo options, cached dimensions) are mutated in place to minimize
 * GC pressure; a new snapshot object is only allocated when the boolean
 * scroll state actually changes.
 */
export declare const RowHeaderSlotsScrollSyncProvider: React.FC<{
    children: React.ReactNode;
    disableScrollSync?: boolean;
}>;
export {};
