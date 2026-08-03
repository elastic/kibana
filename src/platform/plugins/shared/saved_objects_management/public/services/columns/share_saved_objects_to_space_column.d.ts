import React from 'react';
import type { SpacesApiUi } from '@kbn/spaces-plugin/public';
import type { SavedObjectsManagementRecord } from '../types';
import { SavedObjectsManagementColumn } from '../types';
export declare class ShareToSpaceSavedObjectsManagementColumn extends SavedObjectsManagementColumn {
    private readonly spacesApiUi;
    id: string;
    euiColumn: {
        field: string;
        name: string;
        description: string;
        render: (namespaces: string[] | undefined, record: SavedObjectsManagementRecord) => React.JSX.Element;
    };
    refreshOnFinish: () => {
        type: string;
        id: string;
    }[];
    private objectsToRefresh;
    constructor(spacesApiUi: SpacesApiUi);
    private onClose;
}
