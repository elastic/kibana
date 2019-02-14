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

import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { FormRow } from './form_row';
import { injectI18n } from '@kbn/i18n/react';
import { ValidatedDualRange } from 'ui/validated_range';

class RangeControlUi extends Component {
  state = {};

  static getDerivedStateFromProps(nextProps, prevState) {
    const nextValue = nextProps.control.hasValue()
      ? [nextProps.control.value.min, nextProps.control.value.max]
      : ['', ''];

    if (nextValue !== prevState.prevValue) {
      return {
        value: nextValue,
        prevValue: nextValue,
      };
    }

    return null;
  }

  onChangeComplete = _.debounce(value => {
    const controlValue = {
      min: value[0],
      max: value[1]
    };
    this.props.stageFilter(this.props.controlIndex, controlValue);
  }, 200);

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
        <ValidatedDualRange
          disabled
          showInput
        />
      );
    }

    const ticks = [
      { value: this.props.control.min, label: this.formatLabel(this.props.control.min) },
      { value: this.props.control.max, label: this.formatLabel(this.props.control.max) }
    ];

    return (
      <ValidatedDualRange
        id={this.props.control.id}
        min={this.props.control.min}
        max={this.props.control.max}
        value={this.state.value}
        onChange={this.onChangeComplete}
        showInput
        showRange
        showTicks
        ticks={ticks}
      />
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
