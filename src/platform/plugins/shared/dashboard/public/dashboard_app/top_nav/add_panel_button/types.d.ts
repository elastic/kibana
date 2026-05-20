import type { MouseEventHandler, ReactNode } from 'react';
import type { IconType, CommonProps } from '@elastic/eui';
export interface MenuItem extends Pick<CommonProps, 'data-test-subj'> {
    id: string;
    name: string;
    icon: IconType;
    onClick: MouseEventHandler;
    description?: string;
    isDisabled?: boolean;
    isDeprecated?: boolean;
    order: number;
    MenuItem?: ReactNode;
}
export interface MenuItemGroup extends Pick<CommonProps, 'data-test-subj'> {
    id: string;
    isDisabled?: boolean;
    title: string;
    order: number;
    items: MenuItem[];
}
