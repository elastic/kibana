import React from 'react';
import type { FieldHook } from '../../hook_form_lib';
interface Props {
    field: FieldHook;
    euiFieldProps?: Record<string, any>;
    idAria?: string;
    maxFileSize?: number;
    [key: string]: any;
}
export declare const FilePickerField: ({ field, euiFieldProps, idAria, maxFileSize, ...rest }: Props) => React.JSX.Element;
export {};
