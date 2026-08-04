import React from 'react';
import type { EuiFieldTextProps } from '@elastic/eui';
type Props = {
    value: string;
    onChange: (value: string) => void;
    defaultValue?: string;
    allowFalsyValue?: boolean;
} & Omit<EuiFieldTextProps, 'value' | 'onChange' | 'defaultValue'>;
/**
 * When testing this component, mock the "debounce" function in lodash (see this module test for an example)
 */
export declare const DebouncedInput: (props: Props) => React.JSX.Element;
export {};
