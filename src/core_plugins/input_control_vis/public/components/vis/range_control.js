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
    isMinValid: true,
    maxValue: '',
    isMaxValid: true,
    errorMsgs: [],
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
      isMinValid: true,
      maxValue: value.max,
      isMaxValid: true,
      errorMsgs: [],
    });
  }

  handleOnChangeComplete = (value) => {
    this.props.stageFilter(this.props.controlIndex, value);
  }

  handleMinChange = (evt) => {
    const min = parseFloat(evt.target.value);
    const max = this.state.maxValue;
    if (isNaN(min)) {
      if (max === '') {
        this.setState({
          minValue: '',
          isMinValid: true,
          maxValue: '',
          isMaxValid: true,
          errorMsgs: [],
        });
        return;
      }
      this.setState({
        minValue: '',
        isMinValid: false,
        errorMsgs: ['both min and max must be set'],
      });
      return;

    } else if (min > max) {
      this.setState({
        minValue: min,
        isMinValid: false,
        errorMsgs: ['min must be less than max'],
      });
      return;
    }

    this.handleOnChangeComplete({
      min: min,
      max: max
    });
  }

  handleMaxChange = (evt) => {
    const min = this.state.minValue;
    const max = parseFloat(evt.target.value);
    if (isNaN(max)) {
      if (min === '') {
        this.setState({
          minValue: '',
          isMinValid: true,
          maxValue: '',
          isMaxValid: true,
          errorMsgs: [],
        });
        return;
      }
      this.setState({
        maxValue: '',
        isMaxValid: false,
        errorMsgs: ['both min and max must be set'],
      });
      return;

    } else if (max < min) {
      this.setState({
        maxValue: max,
        isMaxValid: false,
        errorMsgs: ['max must be greater than min'],
      });
      return;
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

  renderControl() {
    return (
      <EuiFormRow
        isInvalid={!this.state.isMinValid || !this.state.isMaxValid}
        error={this.state.errorMsgs}
      >
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <input
              id={`${this.props.control.id}_min`}
              disabled={!this.props.control.isEnabled()}
              name="min"
              type="number"
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
