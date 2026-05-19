import React from 'react';
export interface EmailSectionProps {
    email: string;
    allowEmailContact: boolean;
    handleChangeAllowEmailContact: (allow: boolean) => void;
    handleChangeEmail: (email: string) => void;
    onEmailValidationChange: (isValid: boolean) => void;
    getCurrentUserEmail: () => Promise<string | undefined>;
    forceShowEmailError?: boolean;
}
export declare const EmailSection: ({ email, allowEmailContact, handleChangeAllowEmailContact, handleChangeEmail, onEmailValidationChange, getCurrentUserEmail, forceShowEmailError, }: EmailSectionProps) => React.JSX.Element;
