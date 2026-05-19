import React from 'react';
interface Props {
    value: string;
    label?: string;
    testId?: string;
    ariaLabel?: string;
    placeholder?: string;
    handleChangeValue: (feedback: string) => void;
}
export declare const FeedbackTextArea: ({ label, testId, ariaLabel, placeholder, value, handleChangeValue, }: Props) => React.JSX.Element;
export {};
