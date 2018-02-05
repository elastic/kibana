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
