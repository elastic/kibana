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

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { isRangeValid } from './is_range_valid';

import { EuiFormRow, EuiDualRange } from '@elastic/eui';

// Wrapper around EuiDualRange that ensures onChange callback is only called when range value
// is valid and within min/max
export class ValidatedDualRange extends Component {
  state = {};

  static getDerivedStateFromProps(nextProps, prevState) {
    if (nextProps.value !== prevState.prevValue) {
      const { isValid, errorMessage } = isRangeValid(
        nextProps.value,
        nextProps.min,
        nextProps.max,
        nextProps.allowEmptyRange
      );
      return {
        value: nextProps.value,
        prevValue: nextProps.value,
        isValid,
        errorMessage,
      };
    }

    return null;
  }

  _onChange = value => {
    const { isValid, errorMessage } = isRangeValid(
      value,
      this.props.min,
      this.props.max,
      this.props.allowEmptyRange
    );

    this.setState({
      value,
      isValid,
      errorMessage,
    });

    if (isValid) {
      this.props.onChange(value);
    }
  };

  render() {
    const {
      compressed,
      fullWidth,
      label,
      formRowDisplay,
      value, // eslint-disable-line no-unused-vars
      onChange, // eslint-disable-line no-unused-vars
      allowEmptyRange, // eslint-disable-line no-unused-vars
      ...rest
    } = this.props;

    return (
      <EuiFormRow
        compressed={compressed}
        fullWidth={fullWidth}
        isInvalid={!this.state.isValid}
        error={this.state.errorMessage ? [this.state.errorMessage] : []}
        label={label}
        display={formRowDisplay}
      >
        <EuiDualRange
          compressed={compressed}
          fullWidth={fullWidth}
          value={this.state.value}
          onChange={this._onChange}
          {...rest}
        />
      </EuiFormRow>
    );
  }
}

ValidatedDualRange.propTypes = {
  allowEmptyRange: PropTypes.bool,
  fullWidth: PropTypes.bool,
  compressed: PropTypes.bool,
  label: PropTypes.node,
  formRowDisplay: PropTypes.string,
};

ValidatedDualRange.defaultProps = {
  allowEmptyRange: true,
  fullWidth: false,
  compressed: false,
};
