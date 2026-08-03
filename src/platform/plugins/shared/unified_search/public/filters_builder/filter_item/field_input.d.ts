import React from 'react';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
export declare const strings: {
    getFieldSelectPlaceholderLabel: () => string;
};
interface FieldInputProps {
    dataView: DataView;
    onHandleField: (field: DataViewField) => void;
    field?: DataViewField;
}
export declare function FieldInput({ field, dataView, onHandleField }: FieldInputProps): React.JSX.Element;
export {};
