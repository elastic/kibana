import React from 'react';
interface SourcesDropdownProps {
    currentSources: string[];
    onChangeSources: (newSources: string[]) => void;
}
export declare function SourcesDropdown({ currentSources, onChangeSources }: SourcesDropdownProps): React.JSX.Element;
export {};
