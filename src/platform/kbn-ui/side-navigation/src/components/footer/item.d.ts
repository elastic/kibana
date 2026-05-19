import React from 'react';
import type { KeyboardEvent } from 'react';
import type { EuiButtonIconProps, IconType } from '@elastic/eui';
import type { MenuItem } from '../../../types';
export interface FooterItemProps extends Omit<EuiButtonIconProps, 'iconType'>, MenuItem {
    hasContent?: boolean;
    iconType: IconType;
    isCurrent?: boolean;
    isHighlighted: boolean;
    isNew: boolean;
    label: string;
    onClick?: () => void;
    onKeyDown?: (e: KeyboardEvent) => void;
}
/**
 * A footer item that leverages the "Toggle button" pattern from EUI.
 *
 * @see {@link https://eui.elastic.co/docs/components/navigation/buttons/button/#toggle-button}
 */
export declare const FooterItem: React.ForwardRefExoticComponent<FooterItemProps & React.RefAttributes<HTMLAnchorElement>>;
