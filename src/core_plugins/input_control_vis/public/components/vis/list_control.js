import PropTypes from 'prop-types';
import React, { Component } from 'react';
import Select from 'react-select';
import { FormRow } from './form_row';

import {
  EuiFieldText,
} from '@elastic/eui';

export class ListControl extends Component {
  constructor(props) {
    super(props);

    this.handleOnChange = this.handleOnChange.bind(this);
    this.truncate = this.truncate.bind(this);
  }

  handleOnChange(evt) {
    let newValue = '';
    if (evt) {
      newValue = evt;
    }
    this.props.stageFilter(this.props.controlIndex, newValue);
  }

  truncate(selected) {
    if (selected.label.length <= 24) {
      return selected.label;
    }
    return `${selected.label.substring(0, 23)}...`;
  }

  renderControl() {
    if (!this.props.control.isEnabled()) {
      // react-select clobbers the tooltip, so just returning a disabled input instead
      return (
        <EuiFieldText
          disabled={true}
        />
      );
    }

    return (
      <Select
        className="list-control-react-select"
        placeholder="Select..."
        multi={this.props.control.options.multiselect}
        simpleValue={true}
        delimiter={this.props.control.getMultiSelectDelimiter()}
        value={this.props.control.value}
        options={this.props.control.selectOptions}
        onChange={this.handleOnChange}
        valueRenderer={this.truncate}
        inputProps={{ id: this.props.control.id }}
      />
    );
  }

  render() {
    return (
      <FormRow
        id={this.props.control.id}
        label={this.props.control.label}
        controlIndex={this.props.controlIndex}
        control={this.props.control}
      >
        {this.renderControl()}
      </FormRow>
    );
  }
}

ListControl.propTypes = {
  control: PropTypes.object.isRequired,
  controlIndex: PropTypes.number.isRequired,
  stageFilter: PropTypes.func.isRequired
};
