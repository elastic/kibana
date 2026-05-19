export type ScrollContainer = HTMLElement;
/**
 * Gets the main scroll container element for the application.
 * @returns The scroll container element (either the app scroll container or document.documentElement for window scroll)
 */
export declare const getScrollContainer: () => ScrollContainer;
/**
 * Gets the visible height of a scroll container's viewport.
 * @param container - The container to measure. Defaults to the main application scroll container
 * @returns The viewport height in pixels
 */
export declare const getViewportHeight: (container?: ScrollContainer) => number;
/**
 * Gets the vertical boundaries of a scroll container's viewport.
 * Useful for checking if elements are visible within the viewport.
 * @param container - The container to measure. Defaults to the main application scroll container
 * @returns An object with top and bottom pixel values relative to the document
 */
export declare const getViewportBoundaries: (container?: ScrollContainer) => {
    top: number;
    bottom: number;
};
/**
 * Gets the current scroll position of a container.
 * @param container - The container to measure. Defaults to the main application scroll container
 * @returns The current vertical scroll position in pixels
 */
export declare const getScrollPosition: (container?: ScrollContainer) => number;
/**
 * Scrolls a container to a specific vertical position.
 * @param opts - Scroll options
 * @param opts.top - The vertical position to scroll to in pixels
 * @param opts.behavior - The scroll behavior ('auto' or 'smooth'). Default is 'auto'
 * @param container - The container to scroll. Defaults to the main application scroll container
 */
export declare const scrollTo: (opts: {
    top: number;
    behavior?: ScrollBehavior;
}, container?: ScrollContainer) => void;
/**
 * Scrolls a container to the top.
 * @param opts - Scroll options
 * @param opts.behavior - The scroll behavior ('auto' or 'smooth'). Default is 'auto'
 * @param container - The container to scroll. Defaults to the main application scroll container
 */
export declare const scrollToTop: (opts?: {
    behavior?: ScrollBehavior;
}, container?: ScrollContainer) => void;
/**
 * Scrolls a container to the bottom.
 * @param opts - Scroll options
 * @param opts.behavior - The scroll behavior ('auto' or 'smooth'). Default is 'auto'
 * @param container - The container to scroll. Defaults to the main application scroll container
 */
export declare const scrollToBottom: (opts?: {
    behavior?: ScrollBehavior;
}, container?: ScrollContainer) => void;
/**
 * Gets all scroll dimensions of a container at once for efficiency.
 * @param container - The container to measure. Defaults to the main application scroll container
 * @returns An object with scrollTop, scrollHeight, and clientHeight
 */
export declare const getScrollDimensions: (container?: ScrollContainer) => {
    scrollTop: number;
    scrollHeight: number;
    clientHeight: number;
};
/**
 * Scrolls a container by a relative amount.
 * @param opts - Scroll options
 * @param opts.top - The number of pixels to scroll (positive = down, negative = up)
 * @param opts.behavior - The scroll behavior ('auto' or 'smooth'). Default is 'auto'
 * @param container - The container to scroll. Defaults to the main application scroll container
 */
export declare const scrollBy: (opts: {
    top: number;
    behavior?: ScrollBehavior;
}, container?: ScrollContainer) => void;
/**
 * Detects if a scroll container has reached the bottom of its scrollable area.
 * @param container - The container to check. Defaults to the main application scroll container
 * @returns true if the container is scrolled to the bottom, false otherwise
 */
export declare const isAtBottomOfPage: (container?: ScrollContainer) => boolean;
