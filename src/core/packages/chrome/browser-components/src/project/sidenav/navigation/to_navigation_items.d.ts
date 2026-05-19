import type { ChromeProjectNavigationNode, NavigationTreeDefinitionUI } from '@kbn/core-chrome-browser';
import type { NavigationStructure, SideNavLogo } from '@kbn/ui-side-navigation/types';
import type { PanelStateManager } from './panel_state_manager';
export interface NavigationItems {
    logoItem: SideNavLogo;
    navItems: NavigationStructure;
    activeItemId?: string;
}
/**
 * Converts the navigation tree definition and nav links into a format for new navigation.
 *
 * @remarks
 *
 * Structural Assumptions and Mapping
 *
 * - Root node (1st level) is used for the "logo" item and application branding
 * - 2nd level nodes are transformed into primary navigation items:
 *   - Accordion nodes are flattened (not supported) - their children become primary items
 *   - Nodes without links that aren't panel openers are treated as section dividers and not supported in new nav - their children are flattened
 *   - panelOpener nodes create flyout secondary navigation panels, they can't have links directly, but can have sections with links
 * - 3rd level is used for secondary navigation (children of panelOpener):
 *   - If all 3rd level items have links, they're treated as menu items and wrapped in a single section
 *   - If some don't have links, they're treated as section headers with their children becoming menu items
 * - Footer is limited to 5 items maximum (extras are dropped with warning)
 *
 * @param navigationTree
 * @param navLinks
 * @param activeNodes
 * @param panelStateManager - Manager for panel opener state
 */
export declare const toNavigationItems: (navigationTree: NavigationTreeDefinitionUI, activeNodes: ChromeProjectNavigationNode[][], panelStateManager: PanelStateManager) => NavigationItems;
