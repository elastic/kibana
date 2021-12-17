/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { PureComponent } from 'react';

import { EuiForm, EuiFormRow, EuiSwitch } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSwitchEvent } from '@elastic/eui';

import { VisEditorOptionsProps } from 'src/plugins/visualizations/public';
import { InputControlVisParams } from '../../types';

export type OptionsTabProps = VisEditorOptionsProps<InputControlVisParams>;

class OptionsTab extends PureComponent<OptionsTabProps> {
  handleUpdateFiltersChange = (event: EuiSwitchEvent) => {
    this.props.setValue('updateFiltersOnChange', event.target.checked);
  };

  handleUseTimeFilter = (event: EuiSwitchEvent) => {
    this.props.setValue('useTimeFilter', event.target.checked);
  };

  handlePinFilters = (event: EuiSwitchEvent) => {
    this.props.setValue('pinFilters', event.target.checked);
  };

  render() {
    return (
      <EuiForm>
        <EuiFormRow id="updateFiltersOnChange">
          <EuiSwitch
            label={
              <FormattedMessage
                id="inputControl.editor.optionsTab.updateFilterLabel"
                defaultMessage="Update Kibana filters on each change"
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
// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { OptionsTab as default };
