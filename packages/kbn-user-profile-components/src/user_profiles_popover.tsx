/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EuiPopoverProps, EuiContextMenuPanelProps } from '@elastic/eui';
import { FunctionComponent, useCallback, useEffect, useState } from 'react';
import React from 'react';
import { EuiPopover, EuiContextMenuPanel } from '@elastic/eui';

import { UserProfilesSelectable, UserProfilesSelectableProps } from './user_profiles_selectable';

/**
 * Props of {@link UserProfilesPopover} component
 */
export interface UserProfilesPopoverProps extends EuiPopoverProps {
  /**
   * Title of the popover
   * @see EuiContextMenuPanelProps
   */
  title?: EuiContextMenuPanelProps['title'];

  /**
   * Props forwarded to selectable component
   * @see UserProfilesSelectableProps
   */
  selectableProps: UserProfilesSelectableProps;
}

/**
 * Renders a selectable component inside a popover given a list of user profiles
 */
export const UserProfilesPopover: FunctionComponent<UserProfilesPopoverProps> = ({
  title,
  selectableProps,
  ...popoverProps
}) => {
  const [inputElement, setInputElement] = useState<HTMLInputElement | null>(null);

  const setInputRef = useCallback((node: HTMLInputElement | null) => {
    setInputElement(node);
  }, []);

  useEffect(() => {
    inputElement?.focus();
  }, [inputElement]);

  const initialFocus = inputElement ? inputElement : undefined;

  return (
    <EuiPopover panelPaddingSize="none" initialFocus={initialFocus} {...popoverProps}>
      <EuiContextMenuPanel title={title}>
        <UserProfilesSelectable inputRef={setInputRef} {...selectableProps} />
      </EuiContextMenuPanel>
    </EuiPopover>
  );
};
