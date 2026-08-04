import React from 'react';
import type { LanguageDocumentationSections } from '../../types';
interface DocumentationProps {
    language: string;
    sections?: LanguageDocumentationSections;
    searchInDescription?: boolean;
    linkToDocumentation?: string;
}
declare function DocumentationContent({ language, sections, searchInDescription, linkToDocumentation, }: DocumentationProps): React.JSX.Element;
export declare const LanguageDocumentationPopoverContent: React.MemoExoticComponent<typeof DocumentationContent>;
export {};
