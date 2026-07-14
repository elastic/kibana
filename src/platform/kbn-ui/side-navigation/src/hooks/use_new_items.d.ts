import type { MenuItem } from '../../types';
/**
 * Manages 'new' item status with a max of 2 'new' items per level:
 * - Max 2 new primary items
 * - Max 2 new secondary items per parent
 * @param menuItems - Array of menu items to check
 * @param activeItemId - Currently active item ID for auto-marking as visited
 * @returns Functions to check new item status
 */
export declare const useNewItems: (menuItems: MenuItem[], activeItemId?: string) => {
    getIsNewPrimary: (itemId: string) => boolean;
    getIsNewSecondary: (itemId: string) => boolean;
};
