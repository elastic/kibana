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
import { RangeControl } from './range_control';
import { ListControl } from './list_control';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

export class InputControlVis extends Component {
  constructor(props) {
    super(props);

    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleReset = this.handleReset.bind(this);
    this.handleClearAll = this.handleClearAll.bind(this);
  }

  handleSubmit() {
    this.props.submitFilters();
  }

  handleReset() {
    this.props.resetControls();
  }

  handleClearAll() {
    this.props.clearControls();
  }

  renderControls() {

    return this.props.controls.map((control, index) => {
      let controlComponent = null;
      switch (control.type) {
        case 'list':
          controlComponent = (
            <ListControl
              id={control.id}
              label={control.label}
              options={control.selectOptions}
              selectedOptions={control.value}
              formatOptionLabel={control.format}
              disableMsg={control.isEnabled() ? null : control.disabledReason}
              multiselect={control.options.multiselect}
              dynamicOptions={control.options.dynamicOptions}
              controlIndex={index}
              stageFilter={this.props.stageFilter}
              fetchOptions={query => { this.props.refreshControl(index, query); }}
            />
          );
          break;
        case 'range':
          controlComponent = (
            <RangeControl
              control={control}
              controlIndex={index}
              stageFilter={this.props.stageFilter}
            />
          );
          break;
        default:
          throw new Error(`Unhandled control type ${control.type}`);
      }
      return (
        <EuiFlexItem
          key={control.id}
          style={{ minWidth: '250px' }}
          data-test-subj="inputControlItem"
        >
          {controlComponent}
        </EuiFlexItem>
      );
    });
  }

  renderStagingButtons() {
    return (
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiFormRow>
            <EuiButton
              onClick={this.handleClearAll}
              disabled={!this.props.hasValues()}
              data-test-subj="inputControlClearBtn"
            >
              <FormattedMessage id="inputControl.vis.inputControlVis.clearFormButtonLabel" defaultMessage="Clear form"/>
            </EuiButton>
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow>
            <EuiButton
              onClick={this.handleReset}
              disabled={!this.props.hasChanges()}
              data-test-subj="inputControlCancelBtn"
            >
              <FormattedMessage id="inputControl.vis.inputControlVis.cancelChangesButtonLabel" defaultMessage="Cancel changes"/>
            </EuiButton>
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow>
            <EuiButton
              fill
              onClick={this.handleSubmit}
              disabled={!this.props.hasChanges()}
              data-test-subj="inputControlSubmitBtn"
            >
              <FormattedMessage id="inputControl.vis.inputControlVis.applyChangesButtonLabel" defaultMessage="Apply changes"/>
            </EuiButton>
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  render() {
    let stagingButtons;
    if (this.props.controls.length > 0 && !this.props.updateFiltersOnChange) {
      stagingButtons = this.renderStagingButtons();
    }

    return (
      <div className="icvContainer">
        <EuiFlexGroup wrap>
          {this.renderControls()}
        </EuiFlexGroup>
        {stagingButtons}
      </div>
    );
  }
}

InputControlVis.propTypes = {
  stageFilter: PropTypes.func.isRequired,
  submitFilters: PropTypes.func.isRequired,
  resetControls: PropTypes.func.isRequired,
  clearControls: PropTypes.func.isRequired,
  controls: PropTypes.array.isRequired,
  updateFiltersOnChange: PropTypes.bool,
  hasChanges: PropTypes.func.isRequired,
  hasValues: PropTypes.func.isRequired,
  refreshControl: PropTypes.func.isRequired,
};
