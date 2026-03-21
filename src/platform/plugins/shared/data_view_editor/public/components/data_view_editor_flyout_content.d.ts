import type { ReactNode } from 'react';
import React from 'react';
import type { DataView, DataViewSpec } from '../shared_imports';
import type { DataViewEditorService } from '../data_view_editor_service';
export interface Props {
    /**
     * Handler for the "save" footer button
     */
    onSave: (dataViewSpec: DataViewSpec, persist: boolean) => void;
    /**
     * Handler for the "cancel" footer button
     */
    onCancel: () => void;
    defaultTypeIsRollup?: boolean;
    editData?: DataView;
    showManagementLink?: boolean;
    allowAdHoc: boolean;
    dataViewEditorService: DataViewEditorService;
    isDuplicating: boolean;
    onDuplicate?: () => void;
    getDataViewHelpText?: (dataView: DataView) => ReactNode | string | undefined;
}
export declare const IndexPatternEditorFlyoutContent: React.MemoExoticComponent<({ onSave, onCancel, defaultTypeIsRollup, editData, allowAdHoc, showManagementLink, getDataViewHelpText, dataViewEditorService, onDuplicate, isDuplicating, }: Props) => React.JSX.Element>;
