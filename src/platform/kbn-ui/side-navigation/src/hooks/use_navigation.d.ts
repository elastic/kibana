import type { MenuItem, NavigationStructure } from '../../types';
interface NavigationState {
    actualActiveItemId: string | undefined;
    visuallyActivePageId: string | undefined;
    visuallyActiveSubpageId: string | undefined;
    openerNode: MenuItem | null;
    isCollapsed: boolean;
    isSidePanelOpen: boolean;
}
/**
 * Hook for managing the main navigation state.
 *
 * @param isCollapsed - whether the side nav is collapsed.
 * @param items - the navigation structure including primary, secondary, and footer items.
 * @param logoId - the logo ID, used for highlighting the logo.
 * @param activeItemId - the active item ID, used for highlighting the active item.
 * @returns the navigation state including:
 * - `actualActiveItemId` - the actual active item ID. There can only be one `aria-current=page` link on the page.
 * - `visuallyActivePageId` - the visually active page ID. The link does not have to be `aria-current=page`, it can be a parent of an active page.
 * - `visuallyActiveSubpageId` - the visually active subpage ID.
 * - `openerNode` - the primary menu item whose submenu is shown in the side panel.
 * - `isCollapsed` - whether the side nav is collapsed.
 * - `isSidePanelOpen` - whether the side panel is open.
 */
export declare const useNavigation: (isCollapsed: boolean, items: NavigationStructure, logoId: string, activeItemId?: string) => NavigationState;
export {};
