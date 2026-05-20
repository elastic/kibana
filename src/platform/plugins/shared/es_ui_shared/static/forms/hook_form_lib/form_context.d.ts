import React from 'react';
import type { FormHook, FormData } from './types';
interface Props {
    form: FormHook<any>;
    children: React.ReactNode;
}
/**
 * @deprecated `hook_form_lib` is deprecated and will no longer be supported. Consider using
 * `react-hook-form` for new and existing forms.
 */
export declare const FormProvider: ({ children, form }: Props) => React.JSX.Element;
interface Options {
    throwIfNotFound?: boolean;
}
/**
 * @deprecated `hook_form_lib` is deprecated and will no longer be supported. Consider using
 * `react-hook-form` for new and existing forms.
 */
export declare const useFormContext: <T extends FormData = FormData>({ throwIfNotFound, }?: Options) => FormHook<T, T>;
export {};
