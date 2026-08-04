import React from 'react';
interface DocumentationFlyoutProps {
    isHelpMenuOpen: boolean;
    onHelpMenuVisibilityChange: (status: boolean) => void;
    searchInDescription?: boolean;
    linkToDocumentation?: string;
}
declare function DocumentationFlyout({ searchInDescription, linkToDocumentation, isHelpMenuOpen, onHelpMenuVisibilityChange, }: DocumentationFlyoutProps): React.JSX.Element;
export declare const LanguageDocumentationFlyout: React.MemoExoticComponent<typeof DocumentationFlyout>;
export {};
