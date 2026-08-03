import type { FC } from 'react';
import type { SavedObjectWithMetadata, SavedObjectManagementTypeInfo } from '../../../../common';
export interface DeleteConfirmModalProps {
    isDeleting: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    selectedObjects: SavedObjectWithMetadata[];
    allowedTypes: SavedObjectManagementTypeInfo[];
    showPlainSpinner?: boolean;
}
export declare const DeleteConfirmModal: FC<DeleteConfirmModalProps>;
