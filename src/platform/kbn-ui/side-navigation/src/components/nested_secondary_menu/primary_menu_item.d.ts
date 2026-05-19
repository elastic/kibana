import type { ComponentProps, FC, ReactNode } from 'react';
import { SecondaryMenu } from '../secondary_menu';
export interface PrimaryMenuItemProps extends Omit<ComponentProps<typeof SecondaryMenu.Item>, 'children' | 'isHighlighted'> {
    children: ReactNode;
    hasSubmenu?: boolean;
    isCurrent?: boolean;
    isHighlighted?: boolean;
    onClick?: () => void;
}
export declare const PrimaryMenuItem: FC<PrimaryMenuItemProps>;
