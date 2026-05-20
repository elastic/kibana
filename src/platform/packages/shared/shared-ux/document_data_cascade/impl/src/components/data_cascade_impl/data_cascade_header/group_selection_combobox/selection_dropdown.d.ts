import React from 'react';
export interface SelectionDropdownProps {
    onSelectionChange: (groupByColumn: string[]) => void;
}
export declare function SelectionDropdown({ onSelectionChange }: SelectionDropdownProps): React.JSX.Element;
