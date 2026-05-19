import React from 'react';
interface Props {
    isSendFeedbackButtonDisabled: boolean;
    isSubmitting: boolean;
    submitFeedback: () => Promise<void>;
}
export declare const SendFeedbackButton: ({ isSendFeedbackButtonDisabled, isSubmitting, submitFeedback, }: Props) => React.JSX.Element;
export {};
