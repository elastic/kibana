/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { FunctionComponent, useState } from 'react';
import { EuiButtonEmpty, EuiFilterGroup, EuiFilterButton, EuiSpacer, EuiTitle } from '@elastic/eui';
import { UserProfilesPopover, UserProfileWithAvatar } from '@kbn/user-profile-components';
import { PanelWithCodeBlock } from './panel_with_code_block';

export const PopoverDemo: FunctionComponent = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<UserProfileWithAvatar[]>([
    {
      uid: 'u_BOulL4QMPSyV9jg5lQI2JmCkUnokHTazBnet3xVHNv0_0',
      enabled: true,
      data: {},
      user: {
        username: 'delighted_nightingale',
        email: 'delighted_nightingale@elastic.co',
        full_name: 'Delighted Nightingale',
      },
    },
  ]);
  const defaultOptions: UserProfileWithAvatar[] = [
    {
      uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
      enabled: true,
      data: {},
      user: {
        username: 'damaged_raccoon',
        email: 'damaged_raccoon@elastic.co',
        full_name: 'Damaged Raccoon',
      },
    },
    {
      uid: 'u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0',
      enabled: true,
      data: {},
      user: {
        username: 'physical_dinosaur',
        email: 'physical_dinosaur@elastic.co',
        full_name: 'Physical Dinosaur',
      },
    },
    {
      uid: 'u_9xDEQqUqoYCnFnPPLq5mIRHKL8gBTo_NiKgOnd5gGk0_0',
      enabled: true,
      data: {},
      user: {
        username: 'wet_dingo',
        email: 'wet_dingo@elastic.co',
        full_name: 'Wet Dingo',
      },
    },
  ];

  const [isOpen2, setIsOpen2] = useState(false);
  const [selectedOptions2, setSelectedOptions2] = useState<Array<UserProfileWithAvatar | null>>([
    null,
  ]);
  const options2: Array<UserProfileWithAvatar | null> = [
    null,
    {
      uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
      enabled: true,
      data: {},
      user: {
        username: 'damaged_raccoon',
        email: 'damaged_raccoon@elastic.co',
        full_name: 'Damaged Raccoon',
      },
    },
    {
      uid: 'u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0',
      enabled: true,
      data: {},
      user: {
        username: 'physical_dinosaur',
        email: 'physical_dinosaur@elastic.co',
        full_name: 'Physical Dinosaur',
      },
    },
    {
      uid: 'u_9xDEQqUqoYCnFnPPLq5mIRHKL8gBTo_NiKgOnd5gGk0_0',
      enabled: true,
      data: {},
      user: {
        username: 'wet_dingo',
        email: 'wet_dingo@elastic.co',
        full_name: 'Wet Dingo',
      },
    },
  ];

  return (
    <PanelWithCodeBlock title="Popover" code={code}>
      <UserProfilesPopover
        title="Edit assignees"
        button={
          <EuiButtonEmpty iconType="pencil" onClick={() => setIsOpen((value) => !value)}>
            Edit assignees
          </EuiButtonEmpty>
        }
        isOpen={isOpen}
        closePopover={() => setIsOpen(false)}
        selectableProps={{
          selectedOptions,
          defaultOptions,
          onChange: setSelectedOptions,
          height: 32 * 8,
        }}
        panelStyle={{
          width: 32 * 16,
        }}
      />
      <EuiSpacer size="l" />
      <EuiTitle size="xs">
        <h3>Unassigned option</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFilterGroup>
        <UserProfilesPopover
          button={
            <EuiFilterButton
              iconType="arrowDown"
              numFilters={options2.length}
              hasActiveFilters={selectedOptions2.length > 0}
              numActiveFilters={selectedOptions2.length}
              onClick={() => setIsOpen2((value) => !value)}
            >
              Assignees
            </EuiFilterButton>
          }
          isOpen={isOpen2}
          closePopover={() => setIsOpen2(false)}
          selectableProps={{
            selectedOptions: selectedOptions2,
            options: options2,
            onChange: setSelectedOptions2,
            height: 32 * 8,
            nullOptionLabel: 'Unassigned',
          }}
          panelStyle={{
            width: 32 * 16,
          }}
        />
      </EuiFilterGroup>
    </PanelWithCodeBlock>
  );
};

const code = `import { UserProfilesPopover } from '@kbn/user-profile-components';

const [selectedOptions, setSelectedOptions] = useState([
  {
    uid: 'u_BOulL4QMPSyV9jg5lQI2JmCkUnokHTazBnet3xVHNv0_0',
    enabled: true,
    data: {},
    user: {
      username: 'delighted_nightingale',
      email: 'delighted_nightingale@elastic.co',
      full_name: 'Delighted Nightingale',
    },
  },
]);

<UserProfilesPopover
  title="Edit assignees"
  button={
    <EuiButton>
      Edit assignees
    </EuiButton>
  }
  selectableProps={{
    selectedOptions,
    onChange: setSelectedOptions
  }}
/>`;
