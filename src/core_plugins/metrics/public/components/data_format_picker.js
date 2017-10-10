import PropTypes from 'prop-types';
import React, { Component } from 'react';
import _ from 'lodash';
import { Form } from './core';
import { durationOutputOptions, durationInputOptions } from '../lib/component_utils/durations';
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
    this.props.onChange({ value: (this.custom && this.custom.value) || '' });
  }

  handleChange(value) {
    if (value.value === 'custom') {
      this.handleCustomChange();
    } else if (value.value === 'duration') {
      const { from, to, decimals } = this.state;
      this.props.onChange({
        value: `${from},${to},${decimals}`
      });
    } else {
      this.props.onChange(value);
    }
  }

  handleDurationChange(name) {
    return value => {
      if (name === 'decimals') {
        value = this.decimals;
      }
      this.setState(
        {
          [name]: value.value
        },
        () => {
          const { from, to, decimals } = this.state;
          this.props.onChange({
            value: `${from},${to},${decimals}`
          });
        }
      );
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

    if (defaultValue === 'duration') {
      const [from, to, decimals] = value.split(',');
      return (
        <div className="vis_editor__data_format_picker-container">
          <Form.Select label={this.props.label} clearable={false} value={defaultValue} options={options} onChange={this.handleChange} />
          <Form.Select
            label="From"
            clearable={false}
            value={from}
            options={durationInputOptions}
            onChange={this.handleDurationChange('from')}
          />
          <Form.Select label="To" clearable={false} value={to} options={durationOutputOptions} onChange={this.handleDurationChange('to')} />
          <Form.Stepper
            label="Decimal Places"
            inputRef={el => (this.decimals = el)}
            value={decimals}
            options={durationInputOptions}
            min={0}
            max={20}
            onChange={this.handleDurationChange('decimals')}
          />
        </div>
      );
    }

    return (
      <div className="vis_editor__data_format_picker-container">
        <Form.Select label={this.props.label} clearable={false} value={defaultValue} options={options} onChange={this.handleChange} />

        {defaultValue === 'custom' && (
          <div className="vis_editor__data_format_picker-custom_row">
            <Form.Text
              label="Numeral.js Format String"
              onChange={this.handleCustomChange}
              name="custom_format"
              defaultValue={value}
              assistText="API docs"
              assistLink="http://numeraljs.com/"
            />
          </div>
        )}
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
