import React from 'react';
import type { EuiSelectableProps } from '@elastic/eui';
import type { DataViewListItem } from '@kbn/data-views-plugin/public';
export interface DataViewListItemEnhanced extends DataViewListItem {
    isAdhoc?: boolean;
}
export interface DataViewsListProps {
    dataViewsList: DataViewListItemEnhanced[];
    onChangeDataView: (newId: string) => void;
    currentDataViewId?: string;
    selectableProps?: EuiSelectableProps;
    searchListInputId?: string;
}
export declare function DataViewsList({ dataViewsList, onChangeDataView, currentDataViewId, selectableProps, searchListInputId, }: DataViewsListProps): React.JSX.Element;
