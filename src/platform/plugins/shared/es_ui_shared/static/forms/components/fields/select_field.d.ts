import type { ReactNode, OptionHTMLAttributes } from 'react';
import React from 'react';
import type { FieldHook } from '../../hook_form_lib';
export interface Props {
    field: FieldHook;
    euiFieldProps: {
        options: Array<{
            text: string | ReactNode;
            [key: string]: any;
        } & OptionHTMLAttributes<HTMLOptionElement>>;
        [key: string]: any;
    };
    idAria?: string;
    [key: string]: any;
}
export declare const SelectField: ({ field, euiFieldProps, idAria, ...rest }: Props) => React.JSX.Element;
