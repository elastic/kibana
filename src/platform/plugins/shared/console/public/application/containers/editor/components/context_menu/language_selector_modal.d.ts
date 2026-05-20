import React from 'react';
interface Props {
    closeModal: () => void;
    onSubmit: (language: string) => void;
    currentLanguage: string;
    changeDefaultLanguage: (lang: string) => void;
}
export declare const LanguageSelectorModal: ({ closeModal, onSubmit, currentLanguage, changeDefaultLanguage, }: Props) => React.JSX.Element;
export {};
