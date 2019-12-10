/*
 * THIS FILE HAS BEEN MODIFIED FROM THE ORIGINAL SOURCE
 * This comment only applies to modifications applied after the e633644c43a0a0271e0b6c32c382ce1db6b413c3 commit
 *
 * Copyright 2019 LogRhythm, Inc
 * Licensed under the LogRhythm Global End User License Agreement,
 * which can be found through this page: https://logrhythm.com/about/logrhythm-terms-and-conditions/
 */

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

import PropTypes from 'prop-types';
import React, { Component } from 'react';

import { EuiForm, EuiFormRow, EuiSwitch } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

export class OptionsTab extends Component {
  handleUpdateFiltersChange = evt => {
    this.props.setValue('updateFiltersOnChange', evt.target.checked);
  };

  handleUseTimeFilter = evt => {
    this.props.setValue('useTimeFilter', evt.target.checked);
  };

  handlePinFilters = evt => {
    this.props.setValue('pinFilters', evt.target.checked);
  };

  render() {
    return (
      <EuiForm>
        <EuiFormRow id="updateFiltersOnChange">
          <EuiSwitch
            label={
              <FormattedMessage
                id="inputControl.editor.optionsTab.updateFilterLabel"
                defaultMessage="Update NetMon-UI filters on each change"
              />
            }
            checked={this.props.stateParams.updateFiltersOnChange}
            onChange={this.handleUpdateFiltersChange}
            data-test-subj="inputControlEditorUpdateFiltersOnChangeCheckbox"
          />
        </EuiFormRow>

        <EuiFormRow id="useTimeFilter">
          <EuiSwitch
            label={
              <FormattedMessage
                id="inputControl.editor.optionsTab.useTimeFilterLabel"
                defaultMessage="Use time filter"
              />
            }
            checked={this.props.stateParams.useTimeFilter}
            onChange={this.handleUseTimeFilter}
            data-test-subj="inputControlEditorUseTimeFilterCheckbox"
          />
        </EuiFormRow>

        <EuiFormRow id="pinFilters">
          <EuiSwitch
            label={
              <FormattedMessage
                id="inputControl.editor.optionsTab.pinFiltersLabel"
                defaultMessage="Pin filters for all applications"
              />
            }
            checked={this.props.stateParams.pinFilters}
            onChange={this.handlePinFilters}
            data-test-subj="inputControlEditorPinFiltersCheckbox"
          />
        </EuiFormRow>
      </EuiForm>
    );
  }
}

OptionsTab.propTypes = {
  vis: PropTypes.object.isRequired,
  setValue: PropTypes.func.isRequired,
};
