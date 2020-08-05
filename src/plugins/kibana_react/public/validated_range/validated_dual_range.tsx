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
import { i18n } from '@kbn/i18n';
import React, { Component, ReactNode } from 'react';
import { EuiFormRow, EuiDualRange } from '@elastic/eui';
import { EuiFormRowDisplayKeys } from '@elastic/eui/src/components/form/form_row/form_row';
import { EuiDualRangeProps } from '@elastic/eui/src/components/form/range/dual_range';
import { isRangeValid } from './is_range_valid';

// Wrapper around EuiDualRange that ensures onChange callback is only called when range value
// is valid and within min/max

export type Value = EuiDualRangeProps['value'];
export type ValueMember = EuiDualRangeProps['value'][0];

interface Props extends Omit<EuiDualRangeProps, 'value' | 'onChange' | 'min' | 'max'> {
  value?: Value;
  allowEmptyRange?: boolean;
  label?: string | ReactNode;
  formRowDisplay?: EuiFormRowDisplayKeys;
  onChange?: (val: [string, string]) => void;
  min?: number;
  max?: number;
}

interface State {
  isValid?: boolean;
  errorMessage?: string;
  value: [ValueMember, ValueMember];
  prevValue?: Value;
}

export class ValidatedDualRange extends Component<Props> {
  static defaultProps: { fullWidth: boolean; allowEmptyRange: boolean; compressed: boolean } = {
    allowEmptyRange: true,
    fullWidth: false,
    compressed: false,
  };

  static getDerivedStateFromProps(nextProps: Props, prevState: State) {
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

  // @ts-ignore state populated by getDerivedStateFromProps
  state: State = {};

  _onChange = (value: Value) => {
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

    if (this.props.onChange && isValid) {
      this.props.onChange([value[0] as string, value[1] as string]);
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
      ...rest // TODO: Consider alternatives for spread operator in component
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
          minInputProps={{
            'aria-label': i18n.translate('kibana-react.dualRangeControl.minInputAriaLabel', {
              defaultMessage: 'Range minimum',
            }),
          }}
          maxInputProps={{
            'aria-label': i18n.translate('kibana-react.dualRangeControl.maxInputAriaLabel', {
              defaultMessage: 'Range maximum',
            }),
          }}
          {...rest}
        />
      </EuiFormRow>
    );
  }
}
