import type { MenuItem } from '../../types';
/**
 * Get a stable reference to the items array that changes only when we need to recalculate the height.
 *
 * @param items - menu items.
 * @returns the stable items reference.
 */
export declare const useStableMenuItemsReference: (items: MenuItem[]) => MenuItem[];
