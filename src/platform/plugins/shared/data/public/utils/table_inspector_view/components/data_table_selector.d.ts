import React, { Component } from 'react';
import type { Datatable } from '@kbn/expressions-plugin/public';
interface TableSelectorState {
    isPopoverOpen: boolean;
}
interface TableSelectorProps {
    tables: Datatable[];
    selectedTable: Datatable;
    onTableChanged: (table: Datatable) => void;
}
export declare class TableSelector extends Component<TableSelectorProps, TableSelectorState> {
    state: {
        isPopoverOpen: boolean;
    };
    togglePopover: () => void;
    closePopover: () => void;
    renderTableDropdownItem: (table: Datatable, index: number) => React.JSX.Element;
    render(): React.JSX.Element;
}
export {};
