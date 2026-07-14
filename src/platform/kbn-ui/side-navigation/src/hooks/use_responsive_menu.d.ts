import type { MutableRefObject } from 'react';
import type { MenuItem } from '../../types';
interface ResponsiveMenuState {
    primaryMenuRef: MutableRefObject<HTMLElement | null>;
    visibleMenuItems: MenuItem[];
    overflowMenuItems: MenuItem[];
}
/**
 * Custom hook that measures the primary nav container and decides which items can stay visible.
 * Items that no longer fit are moved into the overflow "More" menu so the sidebar keeps its size
 * limits when resizing, zooming, or collapsing.
 *
 * @param isCollapsed - whether the side nav is currently collapsed (affects layout recalculation).
 * @param items - all primary navigation items, in priority order.
 * @param hasForcedMoreButton - whether a "More" button is rendered regardless of responsive overflow
 * (e.g. because items were explicitly hidden by the user). When true, space is reserved for it.
 * @returns an object containing:
 * - `primaryMenuRef` - a ref to the primary menu.
 * - `visibleMenuItems` - the visible menu items.
 * - `overflowMenuItems` - the overflow menu items.
 */
export declare function useResponsiveMenu(isCollapsed: boolean, items: MenuItem[], hasForcedMoreButton?: boolean): ResponsiveMenuState;
export {};
