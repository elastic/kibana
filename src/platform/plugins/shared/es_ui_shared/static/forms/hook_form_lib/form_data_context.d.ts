import React from 'react';
import type { FormData, FormHook } from './types';
import type { Subject } from './lib';
/**
 * @deprecated `hook_form_lib` is deprecated and will no longer be supported. Consider using
 * `react-hook-form` for new and existing forms.
 */
export interface Context<T extends FormData = FormData, I extends FormData = T> {
    getFormData$: () => Subject<FormData>;
    getFormData: FormHook<T, I>['getFormData'];
}
interface Props extends Context {
    children: React.ReactNode;
}
/**
 * This provider wraps the whole form and is consumed by the <Form /> component
 *
 * @deprecated `hook_form_lib` is deprecated and will no longer be supported. Consider using
 * `react-hook-form` for new and existing forms.
 */
export declare const FormDataContextProvider: ({ children, getFormData$, getFormData }: Props) => React.JSX.Element;
/**
 * @deprecated `hook_form_lib` is deprecated and will no longer be supported. Consider using
 * `react-hook-form` for new and existing forms.
 */
export declare function useFormDataContext<T extends FormData = FormData, I extends FormData = T>(): Context<T, I> | undefined;
export {};
