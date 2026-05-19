import { type ReactNode } from 'react';
import type { MenuItem } from '../../../types';
export interface SidePanelIds {
    secondaryNavigationInstructionsId: string;
}
export type SidePanelChildren = ReactNode | ((ids: SidePanelIds) => ReactNode);
export interface SidePanelProps {
    children: SidePanelChildren;
    footer?: ReactNode;
    openerNode: MenuItem;
}
/**
 * Side navigation panel that opens on mouse click if the primary menu item contains a submenu.
 * Shows only in expanded mode.
 */
export declare const SidePanel: ({ children, footer, openerNode }: SidePanelProps) => JSX.Element;
