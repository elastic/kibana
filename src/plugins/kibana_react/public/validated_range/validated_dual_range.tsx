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
import PropTypes, { ReactNodeLike, Requireable } from 'prop-types';
import { EuiFormRow, EuiDualRange } from '@elastic/eui';
import { isRangeValid } from './is_range_valid';

// Wrapper around EuiDualRange that ensures onChange callback is only called when range value
// is valid and within min/max

interface ValidatedRangeValues {
  value: number[];
  min: number;
  max: number;
  allowEmptyRange: boolean;
}

export class ValidatedDualRange extends Component {
  static defaultProps: { fullWidth: boolean; allowEmptyRange: boolean; compressed: boolean };
  static propTypes: {
    fullWidth: Requireable<boolean>;
    allowEmptyRange: Requireable<boolean>;
    formRowDisplay: Requireable<string>;
    compressed: Requireable<boolean>;
    label: Requireable<ReactNodeLike>;
  };

  static getDerivedStateFromProps(nextProps: ValidatedRangeValues, prevState: any) {
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

  state = {};

  _onChange = (value: any) => {
    // @ts-ignore
    const { isValid, errorMessage } = isRangeValid(
      // @ts-ignore
      value,
      // @ts-ignore
      this.props.min,
      // @ts-ignore
      this.props.max,
      // @ts-ignore
      this.props.allowEmptyRange
    );

    this.setState({
      value,
      isValid,
      errorMessage,
    });

    if (isValid) {
      // @ts-ignore
      this.props.onChange(value);
    }
  };

  render() {
    const {
      // @ts-ignore
      compressed,
      // @ts-ignore
      fullWidth,
      // @ts-ignore
      label,
      // @ts-ignore
      formRowDisplay,
      // @ts-ignore
      value, // eslint-disable-line no-unused-vars
      // @ts-ignore
      onChange, // eslint-disable-line no-unused-vars
      // @ts-ignore
      allowEmptyRange, // eslint-disable-line no-unused-vars
      // @ts-ignore
      ...rest
    } = this.props;

    return (
      <EuiFormRow
        compressed={compressed}
        fullWidth={fullWidth}
        // @ts-ignore
        isInvalid={!this.state.isValid}
        // @ts-ignore
        error={this.state.errorMessage ? [this.state.errorMessage] : []}
        label={label}
        display={formRowDisplay}
      >
        <EuiDualRange
          compressed={compressed}
          fullWidth={fullWidth}
          // @ts-ignore
          value={this.state.value}
          onChange={this._onChange}
          // @ts-ignore
          focusable={false} // remove when #59039 is fixed
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
