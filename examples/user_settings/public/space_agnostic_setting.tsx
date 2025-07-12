/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC } from 'react';
import { EuiCheckboxGroup, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import { AppServices } from './types';
import { useUserSetting } from './hooks/use_user_settings';

interface SpaceAgnosticSettingProps {
  services: AppServices;
}

const checkboxes = [
  {
    id: 'checkbox_1',
    label: 'Option one',
    'data-test-sub': 'dts_test',
  },
  {
    id: 'checkbox_2',
    label: 'Option two ( checked by default )',
    className: 'classNameTest',
  },
  {
    id: 'checkbox_3',
    label: 'Option three',
  },
];

export const SpaceAgnosticSetting: FC<SpaceAgnosticSettingProps> = ({ services }) => {
  const [settingValue, setSettingValue] = useUserSetting<Record<string, boolean>>(
    services.userSettings,
    'spaceAgnosticSetting'
  );

  const onSelectionChange = (id: string) => {
    const newValue = {
      ...settingValue,
      [id]: !(settingValue[id] ?? false),
    };
    setSettingValue(newValue);
  };

  return (
    <EuiPanel hasBorder paddingSize="m">
      <EuiFlexGroup gutterSize="s" direction="row">
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s" direction="column">
            <EuiFlexItem>
              <EuiTitle>
                <h2> {'Space Agnostic Setting Example'} </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <p>
                {
                  'This is a NOT space aware setting. This means that any changes to this setting will be visible across all spaces'
                }
              </p>
            </EuiFlexItem>
            <EuiFlexItem>
              <p>
                {
                  'You can now try to change and these login in a different browser or incognito mode to see that the settings are persisted across sessions and spaces.'
                }
              </p>
            </EuiFlexItem>
            <EuiFlexItem />
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCheckboxGroup
            options={checkboxes}
            idToSelectedMap={settingValue}
            onChange={onSelectionChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
