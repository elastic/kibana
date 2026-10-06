/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import type React from 'react';
import { Component } from 'react';
import type { EuiDualRangeProps } from '@elastic/eui';
import type { EuiFormRowDisplayKeys } from '@elastic/eui/src/components/form/form_row/form_row';
export type Value = EuiDualRangeProps['value'];
export type ValueMember = EuiDualRangeProps['value'][0];
interface Props extends Omit<EuiDualRangeProps, 'value' | 'onChange'> {
  value?: Value;
  allowEmptyRange?: boolean;
  label?: string | ReactNode;
  formRowDisplay?: EuiFormRowDisplayKeys;
  onChange?: (val: [string, string]) => void;
}
interface State {
  isValid?: boolean;
  errorMessage?: string;
  value: [ValueMember, ValueMember];
  prevValue?: Value;
}
export declare class ValidatedDualRange extends Component<Props> {
  static defaultProps: {
    fullWidth: boolean;
    allowEmptyRange: boolean;
    compressed: boolean;
  };
  static getDerivedStateFromProps(
    nextProps: Props,
    prevState: State
  ): {
    value: [string | number, string | number] | undefined;
    prevValue: [string | number, string | number] | undefined;
    isValid: boolean;
    errorMessage: string;
  } | null;
  state: State;
  _onChange: (value: Value) => void;
  render(): React.JSX.Element;
}
export {};
