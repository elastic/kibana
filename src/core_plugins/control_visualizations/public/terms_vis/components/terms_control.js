import React, { Component, PropTypes } from 'react';
import Select from 'react-select';

export class TermsControl extends Component {
  constructor(props) {
    super(props);

    this.handleOnChange = this.handleOnChange.bind(this);
  }

  handleOnChange(control, evt) {
    let newValue = '';
    let newFilter = undefined;
    if (evt) {
      newValue = evt.value;
      newFilter = this.props.control.filterManager.createFilter(newValue);
    }
    this.props.stageFilter(this.props.controlIndex, newValue, newFilter);
  }

  render() {
    return (
      <div className="input-control terms-control" data-test-subj="termsControl">
        <span>{this.props.control.label}</span>
        <Select
          className="terms-select"
          placeholder="Select..."
          value={this.props.control.value}
          options={this.props.control.terms}
          onChange={this.handleOnChange.bind(null, this.props.control)}
        />
      </div>
    );
  }
}

TermsControl.propTypes = {
  control: PropTypes.object.isRequired,
  controlIndex: PropTypes.number.isRequired,
  stageFilter: PropTypes.func.isRequired
};
