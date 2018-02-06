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
              control={control}
              controlIndex={index}
              stageFilter={this.props.stageFilter}
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
              Clear form
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
              Cancel changes
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
              Apply changes
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
      <div className="inputControlVis">
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
  hasValues: PropTypes.func.isRequired
};
