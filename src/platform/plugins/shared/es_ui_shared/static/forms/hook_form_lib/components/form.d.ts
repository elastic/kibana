import type { ReactNode } from 'react';
import React from 'react';
import type { FormHook } from '../types';
export interface Props {
    form: FormHook<any>;
    FormWrapper?: React.ComponentType<React.PropsWithChildren<any>>;
    children: ReactNode | ReactNode[];
    [key: string]: any;
}
/**
 * @deprecated `hook_form_lib` is deprecated and will no longer be supported. Consider using
 * `react-hook-form` for new and existing forms.
 */
export declare const Form: ({ form, FormWrapper, ...rest }: Props) => React.JSX.Element;
