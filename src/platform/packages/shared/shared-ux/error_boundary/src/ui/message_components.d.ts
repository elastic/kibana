import React from 'react';
interface FatalPromptProps {
    showErrorDetails: () => void;
    onClickRefresh: () => void;
}
export declare const FatalPrompt: React.FC<ErrorDetailsProps & Omit<FatalPromptProps, "showErrorDetails">>;
interface RecoverablePromptProps {
    onClickRefresh: () => void;
}
export declare const RecoverablePrompt: ({ onClickRefresh }: RecoverablePromptProps) => React.JSX.Element;
interface SectionFatalPromptProps {
    sectionName: string;
    showErrorDetails: () => void;
}
export declare const SectionFatalPrompt: React.FC<ErrorDetailsProps & Omit<SectionFatalPromptProps, "showErrorDetails">>;
interface SectionRecoverablePromptProps {
    sectionName: string;
    onClickRefresh: () => void;
}
export declare const SectionRecoverablePrompt: ({ sectionName, onClickRefresh, }: SectionRecoverablePromptProps) => JSX.Element;
interface ErrorDetailsProps {
    error: Error;
    errorInfo: Partial<React.ErrorInfo> | null;
    name: string | null;
}
export {};
