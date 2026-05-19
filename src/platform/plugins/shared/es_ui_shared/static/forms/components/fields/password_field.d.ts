import React from 'react';
import type { FieldHook } from '../../hook_form_lib';
interface Props {
    field: FieldHook;
    euiFieldProps: Record<string, any>;
    idAria?: string;
    [key: string]: any;
}
export declare const PasswordField: ({ field, euiFieldProps, idAria, ...rest }: Props) => React.JSX.Element;
export {};
