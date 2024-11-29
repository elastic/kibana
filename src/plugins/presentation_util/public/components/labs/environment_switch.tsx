/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiIconTip,
  EuiSpacer,
  EuiScreenReaderOnly,
} from '@elastic/eui';

import { EnvironmentName } from '../../../common/labs';
import { LabsStrings } from '../../i18n';
import { getPresentationCapabilities } from '../../utils/get_presentation_capabilities';

const { Switch: strings } = LabsStrings.Components;

const switchText: { [env in EnvironmentName]: { name: string; help: string } } = {
  kibana: strings.getKibanaSwitchText(),
  browser: strings.getBrowserSwitchText(),
  session: strings.getSessionSwitchText(),
};

export interface Props {
  env: EnvironmentName;
  isChecked: boolean;
  onChange: (checked: boolean) => void;
  name: string;
}

export const EnvironmentSwitch = ({ env, isChecked, onChange, name }: Props) => {
  const { canSetAdvancedSettings } = useMemo(() => {
    return getPresentationCapabilities();
  }, []);

  const canSet = env === 'kibana' ? canSetAdvancedSettings : true;

  return (
    <EuiFlexItem grow={false} style={{ marginBottom: '.25rem' }}>
      <EuiFlexGroup gutterSize="xs" alignItems="flexEnd" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            disabled={!canSet}
            checked={isChecked}
            style={{ marginTop: 1 }}
            label={
              <EuiFlexItem grow={false}>
                <EuiScreenReaderOnly>
                  <span>{name} - </span>
                </EuiScreenReaderOnly>
                {switchText[env].name}
              </EuiFlexItem>
            }
            onChange={(e) => onChange(e.target.checked)}
            compressed
          />
        </EuiFlexItem>
        <EuiFlexItem style={{ textAlign: 'right' }}>
          <EuiIconTip content={switchText[env].help} position="left" />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
    </EuiFlexItem>
  );
};
