import type { EuiBreakpointSize } from '@elastic/eui';
import { type EuiHeaderLinksProps } from '@elastic/eui';
import React from 'react';
import type { TopNavMenuData } from './top_nav_menu_data';
interface TopNavMenuItemsProps {
    config: TopNavMenuData[] | undefined;
    className?: string;
    popoverBreakpoints?: EuiBreakpointSize[];
    gutterSize?: EuiHeaderLinksProps['gutterSize'];
}
/**
 * @deprecated Use AppMenu from "@kbn/core-chrome-app-menu" instead
 */
export declare const TopNavMenuItems: ({ config, className, popoverBreakpoints, gutterSize, }: TopNavMenuItemsProps) => React.JSX.Element | null;
export {};
