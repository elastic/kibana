/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
      value,
      onChange,
      allowEmptyRange,
      ...rest // TODO: Consider alternatives for spread operator in component
    } = this.props;
    // Ensure the form row is display as compressed if compressed is true
    let evaluatedDisplay = formRowDisplay;
    if (!evaluatedDisplay) {
      evaluatedDisplay = compressed ? 'rowCompressed' : 'row';
    }

    return (
      <EuiFormRow
        fullWidth={fullWidth}
        isInvalid={!this.state.isValid}
        error={this.state.errorMessage ? [this.state.errorMessage] : []}
        label={label}
        display={evaluatedDisplay}
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
