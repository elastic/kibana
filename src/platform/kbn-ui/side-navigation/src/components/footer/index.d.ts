import React from 'react';
import type { ReactNode } from 'react';
export interface FooterIds {
    footerNavigationInstructionsId: string;
}
export type FooterChildren = ReactNode | ((ids: FooterIds) => ReactNode);
export interface FooterProps {
    children: FooterChildren;
    isCollapsed: boolean;
    collapseButton?: ReactNode;
}
export declare const Footer: React.ForwardRefExoticComponent<FooterProps & React.RefAttributes<HTMLElement>> & {
    Item: React.ForwardRefExoticComponent<import("./item").FooterItemProps & React.RefAttributes<HTMLAnchorElement>>;
};
