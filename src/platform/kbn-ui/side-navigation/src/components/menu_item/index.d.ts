import React from 'react';
import type { ReactNode, AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import type { IconType } from '@elastic/eui';
interface MenuItemBaseProps {
    children: ReactNode;
    iconType: IconType;
    id?: string;
    isCurrent?: boolean;
    isHighlighted: boolean;
    isHorizontal?: boolean;
    isLabelVisible?: boolean;
    isNew?: boolean;
    isTruncated?: boolean;
}
type MenuItemAnchorRestProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof MenuItemBaseProps | 'href'>;
type MenuItemButtonRestProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof MenuItemBaseProps>;
interface MenuItemWithHref extends MenuItemBaseProps, MenuItemAnchorRestProps {
    href: string;
}
interface MenuItemWithoutHref extends MenuItemBaseProps, MenuItemButtonRestProps {
    href?: undefined;
}
export type MenuItemProps = MenuItemWithHref | MenuItemWithoutHref;
export declare const MenuItem: React.ForwardRefExoticComponent<MenuItemProps & React.RefAttributes<HTMLButtonElement | HTMLAnchorElement>>;
export {};
