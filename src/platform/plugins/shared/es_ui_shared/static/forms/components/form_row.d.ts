import React from 'react';
import type { FieldHook } from '../hook_form_lib';
interface Props {
    title: string | JSX.Element;
    description?: string | JSX.Element;
    field?: FieldHook;
    euiFieldProps?: Record<string, any>;
    titleTag?: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    children?: React.ReactNode;
    [key: string]: any;
}
export declare const FormRow: ({ title, idAria, description, field, children, titleTag, ...rest }: Props) => React.JSX.Element;
/**
 * Get a <FormRow /> component providing some common props for all instances.
 * @param partialProps Partial props to apply to all <FormRow /> instances
 */
export declare const getFormRow: (partialProps: Partial<Props>) => (props: Partial<Props>) => React.JSX.Element;
export {};
