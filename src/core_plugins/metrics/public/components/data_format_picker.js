import PropTypes from 'prop-types';
import React, { Component } from 'react';
import _ from 'lodash';
import Select from 'react-select';
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
    this.props.onChange({ value: this.custom && this.custom.value || '' });
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
    return (value) => {
      if (name === 'decimals') {
        value = this.decimals;
      }
      this.setState({
        [name]: value.value
      }, () => {
        const { from, to, decimals } = this.state;
        this.props.onChange({
          value: `${from},${to},${decimals}`
        });
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

    let custom;
    if (defaultValue === 'duration') {
      const [from, to, decimals] = value.split(',');
      return (
        <div className="vis_editor__data_format_picker-container">
          <div className="vis_editor__label">
            {this.props.label}
          </div>
          <div className="vis_editor__item">
            <Select
              clearable={false}
              value={defaultValue}
              options={options}
              onChange={this.handleChange}
            />
          </div>
          <div className="vis_editor__label">From</div>
          <div className="vis_editor__item">
            <Select
              clearable={false}
              value={from}
              options={durationInputOptions}
              onChange={this.handleDurationChange('from')}
            />
          </div>
          <div className="vis_editor__label">To</div>
          <div className="vis_editor__item">
            <Select
              clearable={false}
              value={to}
              options={durationOutputOptions}
              onChange={this.handleDurationChange('to')}
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
          <Select
            clearable={false}
            value={defaultValue}
            options={options}
            onChange={this.handleChange}
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
