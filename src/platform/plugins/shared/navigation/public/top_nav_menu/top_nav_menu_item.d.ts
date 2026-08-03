import React from 'react';
import type { TopNavMenuData } from './top_nav_menu_data';
/**
 * @deprecated Use AppMenu from "@kbn/core-chrome-app-menu" instead
 */
export interface TopNavMenuItemProps extends TopNavMenuData {
    closePopover: () => void;
    isMobileMenu?: boolean;
}
/**
 * @deprecated Use AppMenu from "@kbn/core-chrome-app-menu" instead
 */
export declare function TopNavMenuItem(props: TopNavMenuItemProps): React.JSX.Element;
export declare namespace TopNavMenuItem {
    var defaultProps: {
        disableButton: boolean;
        tooltip: string;
    };
}
