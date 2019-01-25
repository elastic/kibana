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
import { injectI18n } from '@kbn/i18n/react';

import {
  EuiForm,
  EuiFormRow,
  EuiSwitch,
} from '@elastic/eui';

class OptionsMenuUi extends Component {

  state = {
    useMargins: this.props.useMargins,
    hidePanelTitles: this.props.hidePanelTitles,
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
            label={this.props.intl.formatMessage({
              id: 'kbn.dashboard.topNav.options.useMarginsBetweenPanelsSwitchLabel',
              defaultMessage: 'Use margins between panels',
            })}
            checked={this.state.useMargins}
            onChange={this.handleUseMarginsChange}
            data-test-subj="dashboardMarginsCheckbox"
          />
        </EuiFormRow>

        <EuiFormRow>
          <EuiSwitch
            label={this.props.intl.formatMessage({
              id: 'kbn.dashboard.topNav.options.hideAllPanelTitlesSwitchLabel',
              defaultMessage: 'Hide all panel titles',
            })}
            checked={this.state.hidePanelTitles}
            onChange={this.handleHidePanelTitlesChange}
            data-test-subj="dashboardPanelTitlesCheckbox"
          />
        </EuiFormRow>

      </EuiForm>
    );
  }
}

OptionsMenuUi.propTypes = {
  useMargins: PropTypes.bool.isRequired,
  onUseMarginsChange: PropTypes.func.isRequired,
  hidePanelTitles: PropTypes.bool.isRequired,
  onHidePanelTitlesChange: PropTypes.func.isRequired,
};

export const OptionsMenu = injectI18n(OptionsMenuUi);
