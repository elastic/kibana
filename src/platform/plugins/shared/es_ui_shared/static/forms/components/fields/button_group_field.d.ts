import React from 'react';
import type { EuiButtonGroupOptionProps } from '@elastic/eui';
import type { FieldHook } from '../../hook_form_lib';
interface Props {
    field: FieldHook;
    euiFieldProps: {
        options: EuiButtonGroupOptionProps[];
        legend: string;
        [key: string]: any;
    };
    idAria?: string;
    [key: string]: any;
}
export declare const ButtonGroupField: ({ field, euiFieldProps, idAria, ...rest }: Props) => React.JSX.Element;
export {};
