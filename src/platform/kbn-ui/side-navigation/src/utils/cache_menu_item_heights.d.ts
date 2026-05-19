import type { MutableRefObject } from 'react';
import type { MenuItem } from '../../types';
/**
 * Utility function to cache the heights of the menu items in a ref.
 * It assumes one initial render where all items are in the DOM.
 *
 * @param ref - The ref to the heights cache.
 * @param menu - The menu element.
 * @param items - The menu items.
 */
export declare const cacheMenuItemHeights: (ref: MutableRefObject<number[]>, menu: HTMLElement, items: MenuItem[]) => void;
