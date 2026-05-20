import React from 'react';
import type { FieldHook } from '../../hook_form_lib';
interface Props {
    field: FieldHook;
    euiFieldProps?: Record<string, any>;
    idAria?: string;
    name?: string;
    [key: string]: any;
}
export declare const RadioGroupField: ({ field, euiFieldProps, idAria, name, ...rest }: Props) => React.JSX.Element;
export {};
