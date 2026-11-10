import React from 'react';
import type { EuiSelectableProps } from '@elastic/eui';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
export interface FieldPickerProps {
    dataView?: DataView;
    selectedFieldName?: string;
    filterPredicate?: (f: DataViewField) => boolean;
    onSelectField?: (selectedField: DataViewField) => void;
    selectableProps?: Partial<EuiSelectableProps>;
}
export declare const FieldPicker: ({ dataView, onSelectField, filterPredicate, selectedFieldName, selectableProps, ...other }: FieldPickerProps) => React.JSX.Element;
export default FieldPicker;
