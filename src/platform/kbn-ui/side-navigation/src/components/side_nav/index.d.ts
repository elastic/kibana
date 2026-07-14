import type { FC, ReactNode } from 'react';
import { Footer } from '../footer';
import { Logo } from './logo';
import { NestedSecondaryMenu } from '../nested_secondary_menu';
import { Popover } from './popover';
import { PrimaryMenu } from '../primary_menu';
import { SecondaryMenu } from '../secondary_menu';
import { SidePanel } from './side_panel';
export interface SideNavProps {
    children: ReactNode;
    isCollapsed: boolean;
}
interface SideNavComponent extends FC<SideNavProps> {
    Logo: typeof Logo;
    PrimaryMenu: typeof PrimaryMenu;
    Popover: typeof Popover;
    SecondaryMenu: typeof SecondaryMenu;
    NestedSecondaryMenu: typeof NestedSecondaryMenu;
    Footer: typeof Footer;
    SidePanel: typeof SidePanel;
}
/**
 * A wrapper component for the side navigation that encapsulates:
 * - the logo,
 * - the primary menu,
 * - the secondary menu used in the popover and in the side panel,
 * - the nested secondary menu used in the "More" menu,
 * - the footer,
 * - the side panel.
 */
export declare const SideNav: SideNavComponent;
export {};
