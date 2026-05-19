/**
 * Hook that returns a callback to smoothly scroll an element into view when it becomes active.
 *
 * @param isActive - whether the element should be scrolled into view.
 * @returns a callback function that accepts a ref to scroll into view.
 */
export declare const useScrollToActive: <T extends HTMLElement = HTMLElement>(isActive?: boolean) => (ref: T | null) => void;
