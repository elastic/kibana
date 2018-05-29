/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

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
      return {
        label: option.label,
        value: option.value,
        ['data-test-subj']: `option_${option.value.replace(' ', '_')}`
      };
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
  options: PropTypes.arrayOf(comboBoxOptionShape),
  disableMsg: PropTypes.string,
  multiselect: PropTypes.bool.isRequired,
  controlIndex: PropTypes.number.isRequired,
  stageFilter: PropTypes.func.isRequired
};

ListControl.defaultProps = {
  options: [],
};
