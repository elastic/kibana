import React from 'react';
import type { ReactNode } from 'react';
export interface PrimaryMenuIds {
    mainNavigationInstructionsId: string;
}
export type PrimaryMenuChildren = ReactNode | ((ids: PrimaryMenuIds) => ReactNode);
export interface PrimaryMenuProps {
    children: PrimaryMenuChildren;
    isCollapsed: boolean;
}
export declare const PrimaryMenuBase: React.ForwardRefExoticComponent<PrimaryMenuProps & React.RefAttributes<HTMLElement>>;
export declare const PrimaryMenu: React.ForwardRefExoticComponent<PrimaryMenuProps & React.RefAttributes<HTMLElement>> & {
    Item: React.ForwardRefExoticComponent<import("./item").PrimaryMenuItemProps & React.RefAttributes<HTMLButtonElement | HTMLAnchorElement>>;
};
