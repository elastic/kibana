import React, { Component, PropTypes } from 'react';
import _ from 'lodash';
import Select from 'react-select';

class DataFormatPicker extends Component {

  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
    this.handleCustomChange = this.handleCustomChange.bind(this);
  }

  handleCustomChange() {
    this.props.onChange({ value: this.custom && this.custom.value || '' });
  }

  handleChange(value) {
    if (value.value === 'custom') {
      this.handleCustomChange();
    } else {
      this.props.onChange(value);
    }
  }

  render() {
    const value = this.props.value || '';
    let defaultValue = value;
    if (!_.includes(['bytes', 'number', 'percent'], value)) {
      defaultValue = 'custom';
    }
    const options = [
      { label: 'Bytes', value: 'bytes' },
      { label: 'Number', value: 'number' },
      { label: 'Percent', value: 'percent' },
      { label: 'Custom', value: 'custom' }
    ];

    let custom;
    if (defaultValue === 'custom') {
      custom = (
        <div className="vis_editor__data_format_picker-custom_row">
          <div className="vis_editor__label">
            Format String (See <a href="http://numeraljs.com/" target="_BLANK">Numeral.js</a>)
          </div>
          <input
            className="vis_editor__input"
            defaultValue={value}
            ref={(el) => this.custom = el}
            onChange={this.handleCustomChange}
            type="text"/>
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
            onChange={this.handleChange}/>
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
