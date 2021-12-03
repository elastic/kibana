/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component } from 'react';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { CONTROL_TYPES } from '../../editor_utils';
import { ListControl } from '../../control/list_control_factory';
import { RangeControl } from '../../control/range_control_factory';
import { ListControl as ListControlComponent } from './list_control';
import { RangeControl as RangeControlComponent } from './range_control';

import './input_control_vis.scss';

function isListControl(control: RangeControl | ListControl): control is ListControl {
  return control.type === CONTROL_TYPES.LIST;
}

function isRangeControl(control: RangeControl | ListControl): control is RangeControl {
  return control.type === CONTROL_TYPES.RANGE;
}

interface UnknownControl {
  type: string;
}

interface InputControlVisProps {
  stageFilter: (controlIndex: number, newValue: any) => void;
  submitFilters: () => void;
  resetControls: () => void;
  clearControls: () => void;
  controls: Array<RangeControl | ListControl>;
  updateFiltersOnChange?: boolean;
  hasChanges: () => boolean;
  hasValues: () => boolean;
  refreshControl: (controlIndex: number, query: any) => Promise<void>;
}

export class InputControlVis extends Component<InputControlVisProps> {
  constructor(props: InputControlVisProps) {
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

      if (isListControl(control)) {
        controlComponent = (
          <ListControlComponent
            id={control.id}
            label={control.label}
            options={control.selectOptions}
            selectedOptions={control.value}
            formatOptionLabel={control.format}
            disableMsg={control.isEnabled() ? undefined : control.disabledReason}
            multiselect={control.options.multiselect}
            partialResults={control.partialResults}
            dynamicOptions={control.options.dynamicOptions}
            controlIndex={index}
            stageFilter={this.props.stageFilter}
            fetchOptions={(query) => {
              this.props.refreshControl(index, query);
            }}
          />
        );
      } else if (isRangeControl(control)) {
        controlComponent = (
          <RangeControlComponent
            control={control}
            controlIndex={index}
            stageFilter={this.props.stageFilter}
          />
        );
      } else {
        throw new Error(`Unhandled control type ${(control as UnknownControl)!.type}`);
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
      <EuiFlexGroup wrap={true}>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            onClick={this.handleSubmit}
            disabled={!this.props.hasChanges()}
            data-test-subj="inputControlSubmitBtn"
          >
            <FormattedMessage
              id="inputControl.vis.inputControlVis.applyChangesButtonLabel"
              defaultMessage="Apply changes"
            />
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={this.handleReset}
            disabled={!this.props.hasChanges()}
            data-test-subj="inputControlCancelBtn"
          >
            <FormattedMessage
              id="inputControl.vis.inputControlVis.cancelChangesButtonLabel"
              defaultMessage="Cancel changes"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={this.handleClearAll}
            disabled={!this.props.hasValues()}
            data-test-subj="inputControlClearBtn"
          >
            <FormattedMessage
              id="inputControl.vis.inputControlVis.clearFormButtonLabel"
              defaultMessage="Clear form"
            />
          </EuiButtonEmpty>
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
      <div className="icvContainer__wrapper">
        <div className="icvContainer">
          <EuiFlexGroup wrap>{this.renderControls()}</EuiFlexGroup>
          {stagingButtons}
        </div>
      </div>
    );
  }
}
