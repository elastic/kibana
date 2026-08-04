import React from 'react';
import type { EuiSuperSelectProps } from '@elastic/eui';
import type { FieldHook } from '../../hook_form_lib';
interface Props {
    field: FieldHook;
    euiFieldProps: {
        options: EuiSuperSelectProps<any>['options'];
        [key: string]: any;
    };
    idAria?: string;
    [key: string]: any;
}
export declare const SuperSelectField: ({ field, euiFieldProps, idAria, ...rest }: Props) => React.JSX.Element;
export {};
