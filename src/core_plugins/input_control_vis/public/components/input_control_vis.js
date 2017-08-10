import React, { Component, PropTypes } from 'react';
import { RangeControl } from './range_control';
import { TermsControl } from './terms_control';
import { TextControl } from './text_control';
import { KuiFieldGroup, KuiFieldGroupSection, KuiButton } from 'ui_framework/components';

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

  render() {
    const stagedControls = this.props.getStagedControls();

    let stagingButtons;
    if (!this.props.updateFiltersOnChange) {
      stagingButtons = (
        <KuiFieldGroup>
          <KuiFieldGroupSection>
            <KuiButton
              buttonType="primary"
              type="button"
              onClick={this.handleSubmit}
              disabled={stagedControls.length === 0}
            >
              Update filters
            </KuiButton>
          </KuiFieldGroupSection>
          <KuiFieldGroupSection>
            <KuiButton
              buttonType="basic"
              type="button"
              onClick={this.handleReset}
              disabled={stagedControls.length === 0}
            >
              Cancel
            </KuiButton>
          </KuiFieldGroupSection>
          <KuiFieldGroupSection>
            <KuiButton
              buttonType="basic"
              type="button"
              onClick={this.handleClearAll}
            >
              Clear
            </KuiButton>
          </KuiFieldGroupSection>
        </KuiFieldGroup>
      );
    }
    return (
      <div className="inputControlVis">
        {this.props.controls.map((control, index) => {
          let controlComponent = null;
          switch (control.type) {
            case 'terms':
              controlComponent = (
                <TermsControl
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
            case 'text':
              controlComponent = (
                <TextControl
                  control={control}
                  controlIndex={index}
                  stageFilter={this.props.stageFilter}
                />
              );
          }
          return controlComponent;
        }
        )}

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
  getStagedControls: PropTypes.func.isRequired
};
