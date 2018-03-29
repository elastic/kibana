import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { FormRow } from './form_row';

import {
  EuiFieldText,
  EuiComboBox,
} from '@elastic/eui';

export class ListControl extends Component {

  handleOnChange = (selectedOptions) => {
    this.props.stageFilter(this.props.controlIndex, selectedOptions);
  }

  renderControl() {
    if (!this.props.control.isEnabled()) {
      return (
        <EuiFieldText
          placeholder="Select..."
          disabled={true}
        />
      );
    }

    const options = this.props.control.selectOptions.map(option => {
      option['data-test-subj'] = `option_${option.value.replace(' ', '_')}`;
      return option;
    });

    return (
      <EuiComboBox
        placeholder="Select..."
        options={options}
        selectedOptions={this.props.control.value}
        onChange={this.handleOnChange}
        singleSelection={!this.props.control.options.multiselect}
        data-test-subj={`listControlSelect${this.props.controlIndex}`}
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
