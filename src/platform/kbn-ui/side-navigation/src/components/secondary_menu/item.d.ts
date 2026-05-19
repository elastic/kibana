import type { ReactNode } from 'react';
import type { IconType } from '@elastic/eui';
import type { SecondaryMenuItem } from '../../../types';
export interface SecondaryMenuItemProps extends Omit<SecondaryMenuItem, 'href'> {
    children: ReactNode;
    hasSubmenu?: boolean;
    href?: string;
    iconType?: IconType;
    isCurrent?: boolean;
    isHighlighted: boolean;
    isNew?: boolean;
    onClick?: () => void;
    testSubjPrefix?: string;
}
/**
 * `EuiButton` and `EuiButtonEmpty` are used for consistency with the component library.
 * The only style overrides are making the button labels left-aligned.
 */
export declare const SecondaryMenuItemComponent: ({ badgeType, children, hasSubmenu, href, iconType, id, isCurrent, isExternal, isHighlighted, isNew, testSubjPrefix, ...props }: SecondaryMenuItemProps) => JSX.Element;
