import React from 'react';
import type { DocumentationGroupItem, LanguageDocumentationSections, MultipleLicenseInfo } from '../../types';
interface DocumentationContentProps {
    searchText: string;
    scrollTargets: React.MutableRefObject<{
        [key: string]: HTMLElement;
    }>;
    filteredGroups?: Array<{
        label: string;
        description?: string;
        items: Array<DocumentationGroupItem & {
            preview?: boolean;
            license?: MultipleLicenseInfo | undefined;
        }>;
    }>;
    sections?: LanguageDocumentationSections;
}
declare function DocumentationContent({ searchText, scrollTargets, filteredGroups, sections, }: DocumentationContentProps): React.JSX.Element;
export declare const DocumentationMainContent: React.MemoExoticComponent<typeof DocumentationContent>;
export {};
