import React from 'react';
interface DocumentationNavProps {
    searchText: string;
    setSearchText: (text: string) => void;
    onNavigationChange: (selectedOptions: Array<{
        label: string;
    }>) => void;
    filteredGroups?: Array<{
        label: string;
    }>;
    linkToDocumentation?: string;
    selectedSection?: string;
}
declare function DocumentationNav({ searchText, setSearchText, onNavigationChange, filteredGroups, linkToDocumentation, selectedSection, }: DocumentationNavProps): React.JSX.Element;
export declare const DocumentationNavigation: React.MemoExoticComponent<typeof DocumentationNav>;
export {};
