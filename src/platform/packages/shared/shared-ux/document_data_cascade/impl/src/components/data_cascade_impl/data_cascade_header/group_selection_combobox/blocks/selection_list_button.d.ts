import React from 'react';
export interface SelectionListButtonProps {
    selectionOptions: string[];
    selectedOptions: string[];
    onSelection: (groupByColumn: string) => void;
    clearSelection: () => void;
}
export declare function SelectionListButton({ selectionOptions, selectedOptions, onSelection, clearSelection, }: SelectionListButtonProps): React.JSX.Element;
