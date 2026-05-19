import type { ReactNode } from 'react';
import React, { Component } from 'react';
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
    static getDerivedStateFromProps(nextProps: Props, prevState: State): {
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
