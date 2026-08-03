import React from 'react';
interface DataSourcesListProps {
    sourcesList: string[];
    onChangeDatasources: (newId: string[]) => void;
    currentSources: string[];
}
export declare function DataSourcesList({ sourcesList, onChangeDatasources, currentSources, }: DataSourcesListProps): React.JSX.Element;
export {};
