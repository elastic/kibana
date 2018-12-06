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
import _ from 'lodash';
import { FormRow } from './form_row';
import { injectI18n } from '@kbn/i18n/react';

import {
  EuiFieldText,
  EuiComboBox,
} from '@elastic/eui';

class ListControlUi extends Component {

  state = {
    isLoading: false
  }

  componentDidMount = () => {
    this._isMounted = true;
  }

  componentWillUnmount = () => {
    this._isMounted = false;
  }

  handleOnChange = (selectedOptions) => {
    const selectedValues = selectedOptions.map(({ value }) => {
      return value;
    });
    this.props.stageFilter(this.props.controlIndex, selectedValues);
  }

  debouncedFetch = _.debounce(async (searchValue) => {
    await this.props.fetchOptions(searchValue);

    if (this._isMounted) {
      this.setState({
        isLoading: false,
      });
    }
  }, 300);

  onSearchChange = (searchValue) => {
    this.setState({
      isLoading: true,
    }, this.debouncedFetch.bind(null, searchValue));
  }

  renderControl() {
    const { intl } = this.props;

    if (this.props.disableMsg) {
      return (
        <EuiFieldText
          placeholder={intl.formatMessage({
            id: 'inputControl.vis.listControl.selectTextPlaceholder',
            defaultMessage: 'Select...'
          })}
          disabled={true}
        />
      );
    }

    const options = this.props.options
      .map(option => {
        return {
          label: this.props.formatOptionLabel(option).toString(),
          value: option,
          ['data-test-subj']: `option_${option.toString().replace(' ', '_')}`
        };
      })
      .sort((a, b) => {
        return a.label.toLowerCase().localeCompare(b.label.toLowerCase());
      });

    const selectedOptions = this.props.selectedOptions.map(selectedOption => {
      return {
        label: this.props.formatOptionLabel(selectedOption).toString(),
        value: selectedOption,
      };
    });

    return (
      <EuiComboBox
        placeholder={intl.formatMessage({
          id: 'inputControl.vis.listControl.selectPlaceholder',
          defaultMessage: 'Select...'
        })}
        options={options}
        isLoading={this.state.isLoading}
        async={this.props.dynamicOptions}
        onSearchChange={this.props.dynamicOptions ? this.onSearchChange : undefined}
        selectedOptions={selectedOptions}
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

ListControlUi.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  selectedOptions: PropTypes.array.isRequired,
  options: PropTypes.array,
  formatOptionLabel: PropTypes.func.isRequired,
  disableMsg: PropTypes.string,
  multiselect: PropTypes.bool,
  dynamicOptions: PropTypes.bool,
  controlIndex: PropTypes.number.isRequired,
  stageFilter: PropTypes.func.isRequired,
  fetchOptions: PropTypes.func,
};

ListControlUi.defaultProps = {
  dynamicOptions: false,
  multiselect: true,
};

ListControlUi.defaultProps = {
  selectedOptions: [],
  options: [],
};

export const ListControl = injectI18n(ListControlUi);
