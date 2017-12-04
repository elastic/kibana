import _  from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import InputRange from 'react-input-range';
import { FormRow } from './form_row';

const toState = (props) => {
  const state = {
    sliderValue: props.control.value,
    minValue: '',
    maxValue: ''
  };
  if (props.control.hasValue()) {
    state.minValue = props.control.value.min;
    state.maxValue = props.control.value.max;
  }
  return state;
};

export class RangeControl extends Component {
  constructor(props) {
    super(props);

    this.state = toState(props);
  }

  componentWillReceiveProps = (nextProps) => {
    this.setState(toState(nextProps));
  }

  handleOnChange = (value) => {
    this.setState({
      sliderValue: value,
      minValue: value.min,
      maxValue: value.max
    });
  }

  handleOnChangeComplete = (value) => {
    this.props.stageFilter(this.props.controlIndex, value);
  }

  handleInputChange = (evt) => {
    let inputValue = parseFloat(evt.target.value);
    if (inputValue < this.props.control.min) {
      inputValue = this.props.control.min;
    } else if (inputValue > this.props.control.max) {
      inputValue = this.props.control.max;
    }

    let otherValue;
    if ('min' === evt.target.name) {
      otherValue = this.props.control.value.max;
    } else {
      otherValue = this.props.control.value.min;
    }

    let min;
    let max;
    if (inputValue < otherValue) {
      min = inputValue;
      max = otherValue;
    } else {
      min = otherValue;
      max = inputValue;
    }
    this.handleOnChangeComplete({
      min: min,
      max: max
    });
  }

  formatLabel = (value) => {
    let formatedValue = value;
    const decimalPlaces = _.get(this.props, 'control.options.decimalPlaces');
    if (decimalPlaces !== null && decimalPlaces >= 0) {
      formatedValue = value.toFixed(decimalPlaces);
    }
    return formatedValue;
  }

  render() {
    let disabled = false;
    let disableMsg;
    if (!this.props.control.isEnabled()) {
      disabled = true;
      disableMsg = (
        <p className="kuiStatusText kuiStatusText--warning">
          {this.props.control.disabledReason}
        </p>
      );
    }
    return (
      <FormRow
        id={this.props.control.id}
        label={this.props.control.label}
        controlIndex={this.props.controlIndex}
      >
        <input
          id={`${this.props.control.id}_min`}
          disabled={disabled}
          name="min"
          type="number"
          className="kuiTextInput"
          value={this.state.minValue}
          min={this.props.control.min}
          max={this.props.control.max}
          onChange={this.handleInputChange}
        />
        <div className="inputRangeContainer">
          <InputRange
            disabled={disabled}
            maxValue={this.props.control.max}
            minValue={this.props.control.min}
            step={this.props.control.options.step}
            value={this.state.sliderValue}
            onChange={this.handleOnChange}
            onChangeComplete={this.handleOnChangeComplete}
            draggableTrack={true}
            ariaLabelledby={this.props.control.id}
            formatLabel={this.formatLabel}
          />
        </div>
        <input
          id={`${this.props.control.id}_max`}
          disabled={disabled}
          name="max"
          type="number"
          className="kuiTextInput"
          value={this.state.maxValue}
          min={this.props.control.min}
          max={this.props.control.max}
          onChange={this.handleInputChange}
        />
        {disableMsg}
      </FormRow>
    );
  }
}

RangeControl.propTypes = {
  control: PropTypes.object.isRequired,
  controlIndex: PropTypes.number.isRequired,
  stageFilter: PropTypes.func.isRequired
};
