import type { ReactNode } from 'react';
import React from 'react';
import type { FormHook } from '../types';
export interface Props {
    form: FormHook<any>;
    FormWrapper?: React.ComponentType<React.PropsWithChildren<any>>;
    children: ReactNode | ReactNode[];
    [key: string]: any;
}
export declare const Form: ({ form, FormWrapper, ...rest }: Props) => React.JSX.Element;
