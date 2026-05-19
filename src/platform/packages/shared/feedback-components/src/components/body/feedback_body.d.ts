import React from 'react';
import type { FeedbackRegistryEntry } from '../../types';
export interface FeedbackBodyProps {
    selectedCsatOptionId: string;
    questionAnswers: Record<string, string>;
    allowEmailContact: boolean;
    email: string;
    questions: FeedbackRegistryEntry[];
    appTitle: string;
    handleChangeCsatOptionId: (optionId: string) => void;
    handleChangeQuestionAnswer: (questionId: string, answer: string) => void;
    handleChangeAllowEmailContact: (allow: boolean) => void;
    handleChangeEmail: (email: string) => void;
    onEmailValidationChange: (isValid: boolean) => void;
    getCurrentUserEmail: () => Promise<string | undefined>;
    forceShowEmailError?: boolean;
}
export declare const FeedbackBody: ({ selectedCsatOptionId, questionAnswers, allowEmailContact, email, questions, appTitle, handleChangeCsatOptionId, handleChangeQuestionAnswer, handleChangeAllowEmailContact, handleChangeEmail, onEmailValidationChange, getCurrentUserEmail, forceShowEmailError, }: FeedbackBodyProps) => React.JSX.Element;
