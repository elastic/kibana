import React from 'react';
import type { SavedObjectManagementTypeInfo } from '../../../../common/types';
import type { FailedImportConflict } from '../../../lib/resolve_import_errors';
export interface OverwriteModalProps {
    conflict: FailedImportConflict;
    onFinish: (overwrite: boolean, destinationId?: string) => void;
    allowedTypes: SavedObjectManagementTypeInfo[];
}
export declare const OverwriteModal: ({ conflict, onFinish, allowedTypes }: OverwriteModalProps) => React.JSX.Element;
