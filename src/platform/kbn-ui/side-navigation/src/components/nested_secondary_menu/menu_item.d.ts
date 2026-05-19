import type { ComponentProps, FC, ReactNode } from 'react';
import type { IconType } from '@elastic/eui';
import { SecondaryMenu } from '../secondary_menu';
export interface ItemProps extends Omit<ComponentProps<typeof SecondaryMenu.Item>, 'isHighlighted' | 'href'> {
    children: ReactNode;
    href?: string;
    iconType?: IconType;
    isHighlighted?: boolean;
    isCurrent?: boolean;
    onClick?: () => void;
}
export declare const Item: FC<ItemProps>;
