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

import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';

import {
  EuiForm,
  EuiFormRow,
  EuiSwitch,
} from '@elastic/eui';

export class OptionsTab extends Component {

  setVisParam = (paramName, paramValue) => {
    const params = _.cloneDeep(this.props.scope.vis.params);
    params[paramName] = paramValue;
    this.props.stageEditorParams(params);
  }

  handleUpdateFiltersChange = (evt) => {
    this.setVisParam('updateFiltersOnChange', evt.target.checked);
  }

  handleUseTimeFilter = (evt) => {
    this.setVisParam('useTimeFilter', evt.target.checked);
  }

  handlePinFilters = (evt) => {
    this.setVisParam('pinFilters', evt.target.checked);
  }

  render() {
    return (
      <EuiForm>
        <EuiFormRow
          id="updateFiltersOnChange"
        >
          <EuiSwitch
            label="Update Kibana filters on each change"
            checked={this.props.scope.vis.params.updateFiltersOnChange}
            onChange={this.handleUpdateFiltersChange}
            data-test-subj="inputControlEditorUpdateFiltersOnChangeCheckbox"
          />
        </EuiFormRow>

        <EuiFormRow
          id="useTimeFilter"
        >
          <EuiSwitch
            label="Use time filter"
            checked={this.props.scope.vis.params.useTimeFilter}
            onChange={this.handleUseTimeFilter}
            data-test-subj="inputControlEditorUseTimeFilterCheckbox"
          />
        </EuiFormRow>

        <EuiFormRow
          id="pinFilters"
        >
          <EuiSwitch
            label="Pin filters to global state"
            checked={this.props.scope.vis.params.pinFilters}
            onChange={this.handlePinFilters}
            data-test-subj="inputControlEditorPinFiltersCheckbox"
          />
        </EuiFormRow>
      </EuiForm>
    );
  }
}

OptionsTab.propTypes = {
  scope: PropTypes.object.isRequired,
  stageEditorParams: PropTypes.func.isRequired
};
