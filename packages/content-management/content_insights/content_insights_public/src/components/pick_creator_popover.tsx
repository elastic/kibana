/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonIcon } from '@elastic/eui';
import { UserProfilesPopover, UserProfile } from '@kbn/user-profile-components';
import { useSuggestUsers } from '@kbn/content-management-user-profiles';
import React from 'react';

export interface UserPickerPopoverProps {
  onUserPicked: (user: UserProfile) => void;
}

export const UserPickerPopover = (props: UserPickerPopoverProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedOptions, setSelectedOptions] = React.useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = React.useState<string>('');

  const { data: suggestedUsers } = useSuggestUsers(searchTerm, { enabled: isOpen });

  return (
    <UserProfilesPopover
      title={'Assign creator'}
      button={
        <EuiButtonIcon
          size={'xs'}
          style={{ height: '20px', marginTop: '-4px' }} /* TODO: fix me I am ugly */
          iconType="pencil"
          onClick={() => setIsOpen((value) => !value)}
        />
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      selectableProps={{
        singleSelection: true,
        selectedOptions,
        options: suggestedUsers ?? [],
        // defaultOptions, TODO: me
        onChange: (newUsers) => {
          setSelectedOptions(newUsers);
          props.onUserPicked(newUsers[0]);
          setIsOpen(false);
        },
        onSearchChange(newSearchTerm: string) {
          setSearchTerm(newSearchTerm);
        },
      }}
      // panelStyle={{
      //   width: 32 * 16,
      // }}
    />
  );
};
