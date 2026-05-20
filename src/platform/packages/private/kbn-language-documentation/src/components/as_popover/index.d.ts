import React from 'react';
import type { EuiButtonIconProps } from '@elastic/eui';
import type { LanguageDocumentationSections } from '../../types';
interface DocumentationPopoverProps {
    language: string;
    isHelpMenuOpen: boolean;
    onHelpMenuVisibilityChange: (status: boolean) => void;
    sections?: LanguageDocumentationSections;
    buttonProps?: Omit<EuiButtonIconProps, 'iconType'>;
    searchInDescription?: boolean;
    linkToDocumentation?: string;
}
declare function DocumentationPopover({ language, sections, buttonProps, searchInDescription, linkToDocumentation, isHelpMenuOpen, onHelpMenuVisibilityChange, }: DocumentationPopoverProps): React.JSX.Element;
export declare const LanguageDocumentationPopover: React.MemoExoticComponent<typeof DocumentationPopover>;
export {};
