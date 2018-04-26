import _  from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import InputRange from 'react-input-range';
import { FormRow } from './form_row';

import {
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

const toState = (props) => {
  const state = {
    sliderValue: props.control.value,
    minValue: '',
    maxValue: '',
    isRangeValid: true,
    errorMessage: '',
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
  };

  handleOnChange = (value) => {
    this.setState({
      sliderValue: value,
      minValue: value.min,
      isRangeValid: true,
      maxValue: value.max,
      errorMessage: '',
    });
  };

  handleOnChangeComplete = (value) => {
    this.props.stageFilter(this.props.controlIndex, value);
  };

  handleMinChange = (evt) => {
    this.handleChange(parseFloat(evt.target.value), this.state.maxValue);
  };

  handleMaxChange = (evt) => {
    this.handleChange(this.state.minValue, parseFloat(evt.target.value));
  };

  handleChange = (min, max) => {
    min = isNaN(min) ? '' : min;
    max = isNaN(max) ? '' : max;

    const isMinValid = min !== '';
    const isMaxValid = max !== '';
    let isRangeValid = true;
    let errorMessage = '';

    if ((!isMinValid && isMaxValid) || (isMinValid && !isMaxValid)) {
      isRangeValid = false;
      errorMessage = 'both min and max must be set';
    }

    if (isMinValid && isMaxValid && max < min) {
      isRangeValid = false;
      errorMessage = 'max must be greater or equal to min';
    }

    this.setState({
      minValue: min,
      maxValue: max,
      isRangeValid,
      errorMessage,
    });

    if (isRangeValid && isMaxValid && isMinValid) {
      this.handleOnChangeComplete({ min, max });
    }
  };

  formatLabel = (value) => {
    let formatedValue = value;
    const decimalPlaces = _.get(this.props, 'control.options.decimalPlaces');
    if (decimalPlaces !== null && decimalPlaces >= 0) {
      formatedValue = value.toFixed(decimalPlaces);
    }
    return formatedValue;
  };

  renderControl() {
    return (
      <EuiFormRow
        isInvalid={!this.state.isRangeValid}
        error={this.state.errorMessage ? [this.state.errorMessage] : []}
        data-test-subj="rangeControlFormRow"
      >
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <input
              id={`${this.props.control.id}_min`}
              disabled={!this.props.control.isEnabled()}
              name="min"
              type="number"
              data-test-subj="rangeControlMinInputValue"
              className="euiFieldNumber"
              value={this.state.minValue}
              min={this.props.control.min}
              max={this.props.control.max}
              onChange={this.handleMinChange}
            />
          </EuiFlexItem>
          <EuiFlexItem className="inputRangeContainer">
            <InputRange
              disabled={!this.props.control.isEnabled()}
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
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <input
              id={`${this.props.control.id}_max`}
              disabled={!this.props.control.isEnabled()}
              name="max"
              type="number"
              className="euiFieldNumber"
              data-test-subj="rangeControlMaxInputValue"
              value={this.state.maxValue}
              min={this.props.control.min}
              max={this.props.control.max}
              onChange={this.handleMaxChange}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
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

RangeControl.propTypes = {
  control: PropTypes.object.isRequired,
  controlIndex: PropTypes.number.isRequired,
  stageFilter: PropTypes.func.isRequired
};
