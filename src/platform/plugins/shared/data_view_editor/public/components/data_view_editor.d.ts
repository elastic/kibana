import React from 'react';
import type { DataViewEditorContext, DataViewEditorProps } from '../types';
export interface DataViewEditorPropsWithServices extends DataViewEditorProps {
    services: DataViewEditorContext;
}
export declare const DataViewEditor: ({ onSave, onCancel, services, defaultTypeIsRollup, requireTimestampField, editData, allowAdHocDataView, onDuplicate, isDuplicating, getDataViewHelpText, }: DataViewEditorPropsWithServices) => React.JSX.Element;
