import React, { Component, PropTypes } from 'react';
import { RangeControl } from './range_control';
import { TermsControl } from './terms_control';
import { TextControl } from './text_control';
import { KuiButton } from 'ui_framework/components';

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
    return (
      <div className="vertical-layout input-control-vis">
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
          return <div key={index}>{controlComponent}</div>;
        }
        )}
        <div>
          <KuiButton
            buttonType="primary"
            type="button"
            onClick={this.handleSubmit}
          >
            Submit
          </KuiButton>
          <KuiButton
            buttonType="primary"
            type="button"
            onClick={this.handleReset}
          >
            Reset
          </KuiButton>
          <KuiButton
            buttonType="primary"
            type="button"
            onClick={this.handleClearAll}
          >
            Clear All
          </KuiButton>
        </div>
      </div>
    );
  }
}

InputControlVis.propTypes = {
  stageFilter: PropTypes.func.isRequired,
  submitFilters: PropTypes.func.isRequired,
  resetControls: PropTypes.func.isRequired,
  clearControls: PropTypes.func.isRequired,
  controls: PropTypes.array.isRequired
};
