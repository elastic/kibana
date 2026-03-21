import React from 'react';
import type { FormData, FormHook } from './types';
import type { Subject } from './lib';
export interface Context<T extends FormData = FormData, I extends FormData = T> {
    getFormData$: () => Subject<FormData>;
    getFormData: FormHook<T, I>['getFormData'];
}
interface Props extends Context {
    children: React.ReactNode;
}
/**
 * This provider wraps the whole form and is consumed by the <Form /> component
 */
export declare const FormDataContextProvider: ({ children, getFormData$, getFormData }: Props) => React.JSX.Element;
export declare function useFormDataContext<T extends FormData = FormData, I extends FormData = T>(): Context<T, I> | undefined;
export {};
