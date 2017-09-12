import PropTypes from 'prop-types';
import React, { Component } from 'react';
import Select from 'react-select';
import { FormRow } from './form_row';

export class ListControl extends Component {
  constructor(props) {
    super(props);

    this.handleOnChange = this.handleOnChange.bind(this);
  }

  handleOnChange(evt) {
    let newValue = '';
    if (evt) {
      newValue = evt;
    }
    this.props.stageFilter(this.props.controlIndex, newValue);
  }

  render() {
    return (
      <FormRow
        id={this.props.control.id}
        label={this.props.control.label}
      >
        <Select
          className="list-control-react-select"
          placeholder="Select..."
          multi={this.props.control.options.multiselect}
          simpleValue={true}
          value={this.props.control.value}
          options={this.props.control.selectOptions}
          onChange={this.handleOnChange}
          inputProps={{ id: this.props.control.id }}
        />
      </FormRow>
    );
  }
}

ListControl.propTypes = {
  control: PropTypes.object.isRequired,
  controlIndex: PropTypes.number.isRequired,
  stageFilter: PropTypes.func.isRequired
};
