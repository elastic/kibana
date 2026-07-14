import React from 'react';
import type { ReactNode } from 'react';
import type { IconType } from '@elastic/eui';
import type { MenuItem } from '../../../types';
export interface PrimaryMenuItemProps extends Omit<MenuItem, 'href'> {
    as?: 'a' | 'button';
    children: ReactNode;
    hasContent?: boolean;
    href?: string;
    iconType: IconType;
    isCollapsed: boolean;
    isCurrent?: boolean;
    isHighlighted: boolean;
    isHorizontal?: boolean;
    isNew: boolean;
    onClick?: () => void;
    'aria-posinset'?: number;
    'aria-setsize'?: number;
}
export declare const PrimaryMenuItem: React.ForwardRefExoticComponent<PrimaryMenuItemProps & React.RefAttributes<HTMLButtonElement | HTMLAnchorElement>>;
