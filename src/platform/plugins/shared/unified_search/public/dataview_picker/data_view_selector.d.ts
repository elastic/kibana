import React from 'react';
import type { EuiSelectableProps } from '@elastic/eui';
import type { DataViewListItem, DataViewSpec } from '@kbn/data-views-plugin/public';
export interface DataViewSelectorProps {
    currentDataViewId?: string;
    searchListInputId?: string;
    dataViewsList: DataViewListItem[];
    selectableProps?: EuiSelectableProps;
    setPopoverIsOpen: (isOpen: boolean) => void;
    onChangeDataView: (dataViewId: string) => void;
    onCreateDefaultAdHocDataView?: (dataViewSpec: DataViewSpec) => void;
}
export declare const DataViewSelector: ({ currentDataViewId, searchListInputId, dataViewsList, selectableProps, setPopoverIsOpen, onChangeDataView, onCreateDefaultAdHocDataView, }: DataViewSelectorProps) => React.JSX.Element;
