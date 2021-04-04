/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSwitch, EuiIconTip, EuiSpacer } from '@elastic/eui';

import { ExperimentEnvironment } from '../../../common/experiments';
import { ExperimentsStrings } from '../../i18n';

const { Switch: strings } = ExperimentsStrings.Components;

const switchText: { [env in ExperimentEnvironment]: { name: string; help: string } } = {
  kibana: strings.getKibanaSwitchText(),
  browser: strings.getBrowserSwitchText(),
  session: strings.getSessionSwitchText(),
};

export interface Props {
  env: ExperimentEnvironment;
  isChecked: boolean;
  onChange: (checked: boolean) => void;
}

export const EnvironmentSwitch = ({ env, isChecked, onChange }: Props) => (
  <EuiFlexItem grow={false} style={{ marginBottom: '.25rem' }}>
	<EuiFlexGroup gutterSize="xs" alignItems="flexEnd" responsive={false}>
		<EuiFlexItem grow={false}>
		    <EuiSwitch
		      checked={isChecked}
		      style={{ marginTop: 1 }}
		      label={{switchText[env].name}}
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
