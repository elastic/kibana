import React from 'react';
export interface EmailInputProps {
    email: string;
    handleChangeEmail: (email: string) => void;
    onValidationChange: (isValid: boolean) => void;
    getCurrentUserEmail: () => Promise<string | undefined>;
    forceShowError?: boolean;
}
export declare const EmailInput: ({ email, handleChangeEmail, onValidationChange, getCurrentUserEmail, forceShowError, }: EmailInputProps) => React.JSX.Element;
