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
import PropTypes from 'prop-types';

import {
  EuiForm,
  EuiFormRow,
  EuiSwitch,
} from '@elastic/eui';

export class OptionsMenu extends Component {

  state = {
    darkTheme: this.props.darkTheme,
    useMargins: this.props.useMargins,
    hidePanelTitles: this.props.hidePanelTitles,
  }

  handleDarkThemeChange = (evt) => {
    const isChecked = evt.target.checked;
    this.props.onDarkThemeChange(isChecked);
    this.setState({ darkTheme: isChecked });
  }

  handleUseMarginsChange = (evt) => {
    const isChecked = evt.target.checked;
    this.props.onUseMarginsChange(isChecked);
    this.setState({ useMargins: isChecked });
  }

  handleHidePanelTitlesChange = (evt) => {
    const isChecked = evt.target.checked;
    this.props.onHidePanelTitlesChange(isChecked);
    this.setState({ hidePanelTitles: isChecked });
  }

  render() {
    return (
      <EuiForm
        data-test-subj="dashboardOptionsMenu"
      >

        <EuiFormRow>
          <EuiSwitch
            label="Use dark theme"
            checked={this.state.darkTheme}
            onChange={this.handleDarkThemeChange}
            data-test-subj="dashboardDarkThemeCheckbox"
          />
        </EuiFormRow>

        <EuiFormRow>
          <EuiSwitch
            label="Use margins between panels"
            checked={this.state.useMargins}
            onChange={this.handleUseMarginsChange}
            data-test-subj="dashboardMarginsCheckbox"
          />
        </EuiFormRow>

        <EuiFormRow>
          <EuiSwitch
            label="Hide all panel titles"
            checked={this.state.hidePanelTitles}
            onChange={this.handleHidePanelTitlesChange}
            data-test-subj="dashboardPanelTitlesCheckbox"
          />
        </EuiFormRow>

      </EuiForm>
    );
  }
}

OptionsMenu.propTypes = {
  darkTheme: PropTypes.bool.isRequired,
  onDarkThemeChange: PropTypes.func.isRequired,
  useMargins: PropTypes.bool.isRequired,
  onUseMarginsChange: PropTypes.func.isRequired,
  hidePanelTitles: PropTypes.bool.isRequired,
  onHidePanelTitlesChange: PropTypes.func.isRequired,
};
