import React from 'react';
import type { FieldHook } from '../../hook_form_lib';
interface Props {
    field: FieldHook<any, string>;
    euiCodeEditorProps?: {
        [key: string]: any;
    };
    [key: string]: any;
}
export declare const JsonEditorField: ({ field, ...rest }: Props) => React.JSX.Element;
export {};
