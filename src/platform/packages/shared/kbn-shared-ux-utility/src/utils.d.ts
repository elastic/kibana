import type { MouseEvent } from 'react';
/**
 * Returns true if any modifier key is active on the event, false otherwise.
 */
export declare const hasActiveModifierKey: (event: MouseEvent) => boolean;
/**
 * Returns the closest anchor (`<a>`) element in the element parents (self included) up
 * to the given container (excluded), or undefined if none is found.
 */
export declare const getClosestLink: (element: HTMLElement | null | undefined, container?: HTMLElement) => HTMLAnchorElement | undefined;
