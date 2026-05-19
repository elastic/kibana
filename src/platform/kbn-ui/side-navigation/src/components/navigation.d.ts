import React, { type ReactNode } from 'react';
import type { NavigationStructure, SideNavLogo, MenuItem, SecondaryMenuItem } from '../../types';
export interface NavigationProps {
    /**
     * The active path for the navigation, used for highlighting the current item.
     */
    activeItemId?: string;
    /**
     * Whether the navigation is collapsed. This can be controlled by the parent component.
     */
    isCollapsed: boolean;
    /**
     * The navigation structure containing primary, secondary, and footer items.
     */
    items: NavigationStructure;
    /**
     * The logo object containing the route ID, href, label, and type.
     */
    logo: SideNavLogo;
    /**
     * Required by the grid layout to set the width of the navigation slot.
     */
    setWidth: (width: number) => void;
    /**
     * (optional) Callback fired when a navigation item is clicked.
     */
    onItemClick?: (item: MenuItem | SecondaryMenuItem | SideNavLogo) => void;
    /**
     * Callback fired when the collapse button is toggled.
     *
     * The collapsed state's source of truth lives in chrome_service.tsx as a BehaviorSubject
     * that is persisted to localStorage. External consumers rely on this state.
     */
    onToggleCollapsed?: (isCollapsed: boolean) => void;
    /**
     * (optional) Content to display inside the side panel footer.
     */
    sidePanelFooter?: ReactNode;
    /**
     * (optional) data-test-subj attribute for testing purposes.
     */
    'data-test-subj'?: string;
}
export declare const Navigation: ({ activeItemId, isCollapsed: isCollapsedProp, items, logo, onItemClick, onToggleCollapsed, setWidth, sidePanelFooter, ...rest }: NavigationProps) => React.JSX.Element;
