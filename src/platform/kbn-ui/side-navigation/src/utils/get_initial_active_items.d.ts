import type { MenuItem, NavigationStructure, SecondaryMenuItem } from '../../types';
export interface ActiveItemsState {
    primaryItem: MenuItem | null;
    secondaryItem: SecondaryMenuItem | null;
    isLogoActive: boolean;
}
/**
 * Utility function to determine the active menu items based on the `activeItemId`.
 *
 * @param items - the navigation structure.
 * @param activeItemId - the active item ID.
 * @param logoId - the logo ID.
 * @returns the active items state including: `primaryItem`, `secondaryItem`, and `isLogoActive`.
 */
export declare const getActiveItems: (items: NavigationStructure, activeItemId?: string, logoId?: string) => ActiveItemsState;
