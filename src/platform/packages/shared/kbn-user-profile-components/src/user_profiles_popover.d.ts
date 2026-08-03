import type { EuiContextMenuPanelProps, EuiPopoverProps } from '@elastic/eui';
import React from 'react';
import type { UserProfileWithAvatar } from './user_avatar';
import type { UserProfilesSelectableProps } from './user_profiles_selectable';
/**
 * Props of {@link UserProfilesPopover} component
 */
export interface UserProfilesPopoverProps<Option extends UserProfileWithAvatar | null> extends EuiPopoverProps {
    /**
     * Title of the popover
     * @see EuiContextMenuPanelProps
     */
    title?: EuiContextMenuPanelProps['title'];
    /**
     * Props forwarded to selectable component
     * @see UserProfilesSelectableProps
     */
    selectableProps: UserProfilesSelectableProps<Option>;
}
/**
 * Renders a selectable component inside a popover given a list of user profiles
 */
export declare const UserProfilesPopover: <Option extends UserProfileWithAvatar | null>({ title, selectableProps, ...popoverProps }: UserProfilesPopoverProps<Option>) => React.JSX.Element;
