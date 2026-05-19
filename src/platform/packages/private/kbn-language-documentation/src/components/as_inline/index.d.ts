import React from 'react';
interface DocumentationInlineProps {
    height: number;
    searchInDescription?: boolean;
}
declare function DocumentationInline({ searchInDescription, height }: DocumentationInlineProps): React.JSX.Element;
export declare const LanguageDocumentationInline: React.MemoExoticComponent<typeof DocumentationInline>;
export {};
