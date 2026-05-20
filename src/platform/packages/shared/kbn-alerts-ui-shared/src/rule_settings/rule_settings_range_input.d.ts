import React from 'react';
import type { EuiFormRowProps, EuiRangeProps } from '@elastic/eui';
export interface RuleSettingsRangeInputProps {
    label: EuiFormRowProps['label'];
    labelPopoverText?: string;
    min: number;
    max: number;
    value: number;
    fullWidth?: EuiRangeProps['fullWidth'];
    disabled?: EuiRangeProps['disabled'];
    onChange?: EuiRangeProps['onChange'];
}
export declare const RuleSettingsRangeInput: React.MemoExoticComponent<(props: RuleSettingsRangeInputProps) => React.JSX.Element>;
