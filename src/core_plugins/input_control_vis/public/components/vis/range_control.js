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

import _  from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import InputRange from 'react-input-range';
import { FormRow } from './form_row';
import { injectI18n } from '@kbn/i18n/react';

import {
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiRange,
} from '@elastic/eui';

const toState = ({ control }) => {
  const sliderValue = control.hasValue() ?
    control.value :
    // InputRange component does not have an "empty state"
    // Faking an empty state by setting the slider value range to length of zero anchored at the range minimum
    {
      min: control.min,
      max: control.min
    };
  const state = {
    sliderValue,
    minValue: control.hasValue() ? control.value.min : '',
    maxValue: control.hasValue() ? control.value.max : '',
    isRangeValid: true,
    errorMessage: '',
  };
  return state;
};

class RangeControlUi extends Component {
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
      errorMessage = this.props.intl.formatMessage({
        id: 'inputControl.vis.rangeControl.minMaxValidErrorMessage',
        defaultMessage: 'both min and max must be set'
      });
    }

    if (isMinValid && isMaxValid && max < min) {
      isRangeValid = false;
      errorMessage = this.props.intl.formatMessage({
        id: 'inputControl.vis.rangeControl.maxValidErrorMessage',
        defaultMessage: 'max must be greater or equal to min'
      });
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
    if (!this.props.control.isEnabled()) {
      return (
        <EuiRange
          disabled
        />
      );
    }

    return (
      <EuiFormRow
        isInvalid={!this.state.isRangeValid}
        error={this.state.errorMessage ? [this.state.errorMessage] : []}
        data-test-subj="rangeControlFormRow"
      >
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <input
              id={`${this.props.control.id}_min`}
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
          <EuiFlexItem grow={false} className="icvInputRange__container">
            <InputRange
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
        disableMsg={this.props.control.isEnabled() ? null : this.props.control.disabledReason}
      >
        {this.renderControl()}
      </FormRow>
    );
  }
}

RangeControlUi.propTypes = {
  control: PropTypes.object.isRequired,
  controlIndex: PropTypes.number.isRequired,
  stageFilter: PropTypes.func.isRequired
};

export const RangeControl = injectI18n(RangeControlUi);
