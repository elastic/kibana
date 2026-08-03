import React from 'react';
import type { FieldHook } from '../../hook_form_lib';
interface Props {
    field: FieldHook;
    options: Array<{
        label: string;
        value: string;
        children: React.ReactNode;
        'data-test-subj'?: string;
    }>;
    euiFieldProps?: Record<string, any>;
    idAria?: string;
    [key: string]: any;
}
export declare const CardRadioGroupField: ({ field, options, euiFieldProps, idAria, ...rest }: Props) => React.JSX.Element;
export {};
