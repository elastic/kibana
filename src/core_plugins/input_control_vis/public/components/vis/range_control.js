import _  from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { FormRow } from './form_row';

export class RangeControl extends Component {

  handleOnChange = (evt) => {
    const newValue = _.cloneDeep(this.props.control.value);
    newValue[evt.target.name] = parseFloat(evt.target.value);
    if (newValue.min > newValue.max) {
      const realMax = newValue.min;
      newValue.min = newValue.max;
      newValue.max = realMax;
    }
    this.props.stageFilter(this.props.controlIndex, newValue);
  }

  render() {
    return (
      <FormRow
        id={this.props.control.id}
        label={this.props.control.label}
      >
        <div className="inputRangeContainer">
          <input
            type="range"
            name="min"
            value={this.props.control.value.min}
            min={this.props.control.min}
            max={this.props.control.max}
            step={this.props.control.options.step}
            onChange={this.handleOnChange}
          />
          <input
            type="number"
            value={this.props.control.value.min}
            min={this.props.control.min}
            max={this.props.control.max}
          />
          TO
          <input
            type="range"
            name="max"
            value={this.props.control.value.max}
            min={this.props.control.min}
            max={this.props.control.max}
            step={this.props.control.options.step}
            onChange={this.handleOnChange}
          />
          <input
            type="number"
            value={this.props.control.value.max}
            min={this.props.control.min}
            max={this.props.control.max}
          />
        </div>
      </FormRow>
    );
  }
}

RangeControl.propTypes = {
  control: PropTypes.object.isRequired,
  controlIndex: PropTypes.number.isRequired,
  stageFilter: PropTypes.func.isRequired
};
