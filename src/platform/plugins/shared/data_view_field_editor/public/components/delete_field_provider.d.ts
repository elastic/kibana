import React from 'react';
import type { DataView } from '../shared_imports';
import type { OpenFieldDeleteModalOptions } from '../open_delete_modal';
import type { CloseEditor } from '../types';
type DeleteFieldFunc = (fieldName: string | string[]) => void;
export interface Props {
    children: (deleteFieldHandler: DeleteFieldFunc) => React.ReactNode;
    /**
     * Data view of fields to be deleted
     */
    dataView: DataView;
    /**
     * Callback fired when fields are deleted
     * @param fieldNames - the names of the deleted fields
     */
    onDelete?: (fieldNames: string[]) => void;
}
export declare const getDeleteFieldProvider: (modalOpener: (options: OpenFieldDeleteModalOptions) => Promise<CloseEditor>) => React.FunctionComponent<Props>;
export {};
