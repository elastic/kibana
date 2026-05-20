import React from 'react';
interface Props {
    title: string;
    formFieldPath: string;
    children: React.ReactNode;
    description?: string | JSX.Element;
    withDividerRule?: boolean;
    disabled?: boolean;
    'data-test-subj'?: string;
}
export declare const FormRow: ({ title, description, children, formFieldPath, disabled, withDividerRule, "data-test-subj": dataTestSubj, }: Props) => React.JSX.Element;
export {};
