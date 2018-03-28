import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { FormRow } from './form_row';

import {
  EuiFieldText,
  EuiComboBox,
} from '@elastic/eui';

export class ListControl extends Component {
  constructor(props) {
    super(props);

    this.truncate = this.truncate.bind(this);
  }

  handleOnChange = (selectedOptions) => {
    this.props.stageFilter(this.props.controlIndex, selectedOptions);
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
    console.log(this.props.control.value);
    console.log(this.props.control.selectOptions);


    /*
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
      */

    return (
      <EuiComboBox
        options={this.props.control.selectOptions}
        selectedOptions={this.props.control.value}
        onChange={this.handleOnChange}
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
