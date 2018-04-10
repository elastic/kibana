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
    if (this.props.disableMsg) {
      return (
        <EuiFieldText
          placeholder="Select..."
          disabled={true}
        />
      );
    }

    const options = this.props.options.map(option => {
      option['data-test-subj'] = `option_${option.value.replace(' ', '_')}`;
      return option;
    });

    return (
      <EuiComboBox
        placeholder="Select..."
        options={options}
        selectedOptions={this.props.selectedOptions}
        onChange={this.handleOnChange}
        singleSelection={!this.props.multiselect}
        data-test-subj={`listControlSelect${this.props.controlIndex}`}
      />
    );
  }

  render() {
    return (
      <FormRow
        id={this.props.id}
        label={this.props.label}
        controlIndex={this.props.controlIndex}
        disableMsg={this.props.disableMsg}
      >
        {this.renderControl()}
      </FormRow>
    );
  }
}

const comboBoxOptionShape = PropTypes.shape({
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
});

ListControl.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  selectedOptions: PropTypes.arrayOf(comboBoxOptionShape).isRequired,
  options: PropTypes.arrayOf(comboBoxOptionShape).isRequired,
  disableMsg: PropTypes.string,
  multiselect: PropTypes.bool.isRequired,
  controlIndex: PropTypes.number.isRequired,
  stageFilter: PropTypes.func.isRequired
};
