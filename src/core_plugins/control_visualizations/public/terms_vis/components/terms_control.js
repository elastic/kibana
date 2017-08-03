import React, { Component, PropTypes } from 'react';
import Select from 'react-select';

export class TermsControl extends Component {
  constructor(props) {
    super(props);

    this.handleOnChange = this.handleOnChange.bind(this);
  }

  handleOnChange(control, evt) {
    if (evt) {
      this.props.setFilter(control.filterManager, evt.value);
    } else {
      this.props.removeFilter(control.filterManager);
    }
  }

  render() {
    return (
      <div className="input-control" data-test-subj="termsControl">
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
  setFilter: PropTypes.func.isRequired,
  removeFilter: PropTypes.func.isRequired,
  control: PropTypes.object.isRequired
};
