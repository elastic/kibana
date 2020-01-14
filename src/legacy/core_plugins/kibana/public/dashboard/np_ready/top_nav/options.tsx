/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { Component } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiForm, EuiFormRow, EuiSwitch } from '@elastic/eui';

interface Props {
  useMargins: boolean;
  onUseMarginsChange: (useMargins: boolean) => void;
  hidePanelTitles: boolean;
  onHidePanelTitlesChange: (hideTitles: boolean) => void;
}

interface State {
  useMargins: boolean;
  hidePanelTitles: boolean;
}

export class OptionsMenu extends Component<Props, State> {
  state = {
    useMargins: this.props.useMargins,
    hidePanelTitles: this.props.hidePanelTitles,
  };

  constructor(props: Props) {
    super(props);
  }

  handleUseMarginsChange = (evt: any) => {
    const isChecked = evt.target.checked;
    this.props.onUseMarginsChange(isChecked);
    this.setState({ useMargins: isChecked });
  };

  handleHidePanelTitlesChange = (evt: any) => {
    const isChecked = !evt.target.checked;
    this.props.onHidePanelTitlesChange(isChecked);
    this.setState({ hidePanelTitles: isChecked });
  };

  render() {
    return (
      <EuiForm data-test-subj="dashboardOptionsMenu">
        <EuiFormRow>
          <EuiSwitch
            label={i18n.translate(
              'kbn.dashboard.topNav.options.useMarginsBetweenPanelsSwitchLabel',
              {
                defaultMessage: 'Use margins between panels',
              }
            )}
            checked={this.state.useMargins}
            onChange={this.handleUseMarginsChange}
            data-test-subj="dashboardMarginsCheckbox"
          />
        </EuiFormRow>

        <EuiFormRow>
          <EuiSwitch
            label={i18n.translate('kbn.dashboard.topNav.options.hideAllPanelTitlesSwitchLabel', {
              defaultMessage: 'Show panel titles',
            })}
            checked={!this.state.hidePanelTitles}
            onChange={this.handleHidePanelTitlesChange}
            data-test-subj="dashboardPanelTitlesCheckbox"
          />
        </EuiFormRow>
      </EuiForm>
    );
  }
}
