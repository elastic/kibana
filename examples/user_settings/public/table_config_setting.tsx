/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiSwitchEvent,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonGroup,
  EuiSwitch,
  EuiRange,
  EuiTitle,
  EuiFormRow,
  EuiListGroupItem,
  EuiListGroup,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { FC } from 'react';
import { _SingleRangeChangeEvent } from '@elastic/eui/src/components/form/range/types';
import { tableConfigurationSetting } from './constants';
import { useUserSetting } from './hooks/use_user_settings';
import { AppServices } from './types';

interface TableConfiguration {
  autoFit: boolean;
  rowHeight: number;
  rowDensity: string;
}

const toggleButtons = [
  {
    id: `compact`,
    label: `Compact`,
  },
  {
    id: `default`,
    label: 'Default',
  },
  {
    id: 'comfortable',
    label: 'Comfortable',
  },
];

interface TableConfigSettingProps {
  services: AppServices;
}

export const TableConfigSetting: FC<TableConfigSettingProps> = ({ services }) => {
  const [tableConfigration, setTableConfiguration] = useUserSetting<TableConfiguration>(
    services.userSettings,
    tableConfigurationSetting.name
  );

  const onSwitchChange = (ev: EuiSwitchEvent) => {
    setTableConfiguration({
      ...tableConfigration,
      autoFit: ev.target.checked,
    });
  };

  const onRowDensityChange = (id: string) => {
    setTableConfiguration({
      ...tableConfigration,
      rowDensity: id,
    });
  };

  const onRowHeightChange = (e: _SingleRangeChangeEvent) => {
    setTableConfiguration({
      ...tableConfigration,
      rowHeight: parseInt(e.currentTarget.value, 10),
    });
  };

  const inputRangeSliderId = useGeneratedHtmlId({ prefix: 'inputRangeSlider' });

  return (
    <EuiPanel hasBorder paddingSize="l">
      <EuiFlexGroup gutterSize="m" direction="row">
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s" direction="column">
            <EuiFlexItem>
              <EuiTitle>
                <h2> {'Table Configuration'} </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <p>
                {
                  'This is a space aware setting. Below will be the default values if you has not changed it already.'
                }
              </p>
            </EuiFlexItem>
            <EuiFlexItem>
              <p>
                {
                  'You can now try to change and these login in a different browser or incognito mode to see that the settings are persisted across sessions.'
                }
              </p>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiListGroup>
                <EuiListGroupItem
                  label={
                    <span>
                      Row Height: <b>20</b>
                    </span>
                  }
                />
                <EuiListGroupItem
                  label={
                    <span>
                      Row Density: <b>Default</b>
                    </span>
                  }
                />
                <EuiListGroupItem
                  label={
                    <span>
                      Autofit content: <b>False</b>
                    </span>
                  }
                />
              </EuiListGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow>
            <EuiSwitch
              checked={tableConfigration.autoFit}
              onChange={onSwitchChange}
              label={'Autofit content'}
              showLabel
            />
          </EuiFormRow>
          <EuiFormRow>
            <>
              <EuiTitle size="xxs">
                <h3>Row Density</h3>
              </EuiTitle>
              <EuiButtonGroup
                legend="Default single select button group"
                isFullWidth={true}
                isDisabled={false}
                options={toggleButtons}
                idSelected={tableConfigration.rowDensity}
                onChange={onRowDensityChange}
              />
            </>
          </EuiFormRow>
          <EuiFormRow>
            <>
              <EuiTitle size="xxs">
                <h3>Row Height</h3>
              </EuiTitle>
              <EuiRange
                id={inputRangeSliderId}
                min={0}
                max={100}
                value={tableConfigration.rowHeight}
                onChange={onRowHeightChange}
                showInput
                aria-label="An example of EuiRange"
              />
            </>
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
