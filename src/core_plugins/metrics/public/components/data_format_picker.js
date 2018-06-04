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
import {
  EuiComboBox,
} from '@elastic/eui';
import { durationOutputOptions, durationInputOptions } from './lib/durations';
const durationFormatTest = /[pnumshdwMY]+,[pnumshdwMY]+/;

class DataFormatPicker extends Component {

  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
    this.handleCustomChange = this.handleCustomChange.bind(this);
    let from = 'ms';
    let to = 'ms';
    let decimals = 2;
    if (durationFormatTest.test(props.value)) {
      [from, to, decimals] = props.value.split(',');
    }
    this.state = {
      from,
      to,
      decimals
    };
  }

  handleCustomChange() {
    this.props.onChange([{ value: this.custom && this.custom.value || '' }]);
  }

  handleChange(selectedOptions) {
    if (selectedOptions.length < 1) {
      return;
    }

    if (selectedOptions[0].value === 'custom') {
      this.handleCustomChange();
    } else if (selectedOptions[0].value === 'duration') {
      const { from, to, decimals } = this.state;
      this.props.onChange([{
        value: `${from},${to},${decimals}`
      }]);
    } else {
      this.props.onChange(selectedOptions);
    }
  }

  handleDurationChange(name) {
    return (selectedOptions) => {
      if (selectedOptions.length < 1) {
        return;
      }

      let newValue;
      if (name === 'decimals') {
        newValue = this.decimals.value;
      } else {
        newValue = selectedOptions[0].value;
      }

      this.setState({
        [name]: newValue
      }, () => {
        const { from, to, decimals } = this.state;
        this.props.onChange([{
          value: `${from},${to},${decimals}`
        }]);
      });
    };
  }

  render() {
    const value = this.props.value || '';
    let defaultValue = value;
    if (!_.includes(['bytes', 'number', 'percent'], value)) {
      defaultValue = 'custom';
    }
    if (durationFormatTest.test(value)) {
      defaultValue = 'duration';
    }
    const options = [
      { label: 'Bytes', value: 'bytes' },
      { label: 'Number', value: 'number' },
      { label: 'Percent', value: 'percent' },
      { label: 'Duration', value: 'duration' },
      { label: 'Custom', value: 'custom' }
    ];
    const selectedOption = options.find(option => {
      return defaultValue === option.value;
    });

    let custom;
    if (defaultValue === 'duration') {
      const [from, to, decimals] = value.split(',');
      const selectedFrom = durationInputOptions.find(option => {
        return from === option.value;
      });
      const selectedTo = durationOutputOptions.find(option => {
        return to === option.value;
      });
      return (
        <div className="vis_editor__data_format_picker-container">
          <div className="vis_editor__label">
            {this.props.label}
          </div>
          <div className="vis_editor__item">
            <EuiComboBox
              isClearable={false}
              options={options}
              selectedOptions={selectedOption ? [selectedOption] : []}
              onChange={this.handleChange}
              singleSelection={true}
            />
          </div>
          <div className="vis_editor__label">From</div>
          <div className="vis_editor__item">
            <EuiComboBox
              isClearable={false}
              options={durationInputOptions}
              selectedOptions={selectedFrom ? [selectedFrom] : []}
              onChange={this.handleDurationChange('from')}
              singleSelection={true}
            />
          </div>
          <div className="vis_editor__label">To</div>
          <div className="vis_editor__item">
            <EuiComboBox
              isClearable={false}
              options={durationOutputOptions}
              selectedOptions={selectedTo ? [selectedTo] : []}
              onChange={this.handleDurationChange('to')}
              singleSelection={true}
            />
          </div>
          <div className="vis_editor__label">Decimal Places</div>
          <input
            style={{ width: 60 }}
            className="vis_editor__input"
            defaultValue={decimals}
            ref={(el) => this.decimals = el}
            onChange={this.handleDurationChange('decimals')}
            type="text"
          />
        </div>
      );
    }
    if (defaultValue === 'custom') {
      custom = (
        <div className="vis_editor__data_format_picker-custom_row">
          <div className="vis_editor__label">
            Format String (See <a href="http://numeraljs.com/#format" target="_BLANK">Numeral.js</a>)
          </div>
          <input
            style={{ width: 100 }}
            className="vis_editor__input"
            defaultValue={value}
            ref={(el) => this.custom = el}
            onChange={this.handleCustomChange}
            type="text"
          />
        </div>
      );
    }
    return (
      <div className="vis_editor__data_format_picker-container">
        <div className="vis_editor__label">
          {this.props.label}
        </div>
        <div className="vis_editor__item">
          <EuiComboBox
            isClearable={false}
            options={options}
            selectedOptions={selectedOption ? [selectedOption] : []}
            onChange={this.handleChange}
            singleSelection={true}
          />
        </div>
        {custom}
      </div>
    );
  }

}

DataFormatPicker.defaultProps = {
  label: 'Data Formatter'
};

DataFormatPicker.propTypes = {
  value: PropTypes.string,
  label: PropTypes.string,
  onChange: PropTypes.func
};

export default DataFormatPicker;
