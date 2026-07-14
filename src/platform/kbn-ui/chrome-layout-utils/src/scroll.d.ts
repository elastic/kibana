export type ScrollContainer = HTMLElement;
export declare const getScrollContainer: () => ScrollContainer;
export declare const getViewportHeight: (container?: ScrollContainer) => number;
export declare const getViewportBoundaries: (container?: ScrollContainer) => {
    top: number;
    bottom: number;
};
export declare const getScrollPosition: (container?: ScrollContainer) => number;
export declare const scrollTo: (opts: {
    top: number;
    behavior?: ScrollBehavior;
}, container?: ScrollContainer) => void;
export declare const scrollToTop: (opts?: {
    behavior?: ScrollBehavior;
}, container?: ScrollContainer) => void;
export declare const scrollToBottom: (opts?: {
    behavior?: ScrollBehavior;
}, container?: ScrollContainer) => void;
export declare const getScrollDimensions: (container?: ScrollContainer) => {
    scrollTop: number;
    scrollHeight: number;
    clientHeight: number;
};
export declare const scrollBy: (opts: {
    top: number;
    behavior?: ScrollBehavior;
}, container?: ScrollContainer) => void;
export declare const isAtBottomOfPage: (container?: ScrollContainer) => boolean;
