import React from 'react';
import type { EuiSelectableProps } from '@elastic/eui';
import type { DataViewListItem } from '@kbn/data-views-plugin/common';
import type { ToolbarButtonProps } from '@kbn/shared-ux-button-toolbar';
export type DataViewTriggerProps = Omit<ToolbarButtonProps<'standard'>, 'label'> & {
    label: string;
    title?: string;
};
export declare function DataViewPicker({ dataViews, selectedDataViewId, onChangeDataViewId, trigger, selectableProps, ...other }: {
    dataViews: DataViewListItem[];
    selectedDataViewId?: string;
    trigger: DataViewTriggerProps;
    onChangeDataViewId: (newId: string) => void;
    selectableProps?: Partial<EuiSelectableProps>;
}): React.JSX.Element;
export default DataViewPicker;
