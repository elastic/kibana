import React from 'react';
import type { FieldHook } from '../hook_form_lib';
interface Props {
    field: FieldHook;
    euiFieldProps?: {
        [key: string]: any;
    };
    [key: string]: any;
}
export declare const Field: (props: Props) => React.JSX.Element;
export {};
