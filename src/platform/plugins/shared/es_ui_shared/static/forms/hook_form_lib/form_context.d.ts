import React from 'react';
import type { FormHook, FormData } from './types';
interface Props {
    form: FormHook<any>;
    children: React.ReactNode;
}
export declare const FormProvider: ({ children, form }: Props) => React.JSX.Element;
interface Options {
    throwIfNotFound?: boolean;
}
export declare const useFormContext: <T extends FormData = FormData>({ throwIfNotFound, }?: Options) => FormHook<T, T>;
export {};
