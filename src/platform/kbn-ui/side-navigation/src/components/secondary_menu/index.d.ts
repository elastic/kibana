import React from 'react';
import type { ReactNode } from 'react';
import type { BadgeType } from '../../../types';
export interface SecondaryMenuProps {
    badgeType?: BadgeType;
    children: ReactNode;
    isNew?: boolean;
    isPanel?: boolean;
    title: string;
}
/**
 * This menu is reused between the side nav panel and the side nav popover.
 */
export declare const SecondaryMenu: React.ForwardRefExoticComponent<SecondaryMenuProps & React.RefAttributes<HTMLDivElement>> & {
    Item: ({ badgeType, children, hasSubmenu, href, iconType, id, isCurrent, isExternal, isHighlighted, isNew, testSubjPrefix, ...props }: import("./item").SecondaryMenuItemProps) => JSX.Element;
    Section: ({ children, label, }: import("./section").SecondaryMenuSectionProps) => JSX.Element;
};
