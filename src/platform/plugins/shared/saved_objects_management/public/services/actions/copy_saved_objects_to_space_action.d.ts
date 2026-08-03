import React from 'react';
import type { SpacesApiUi } from '@kbn/spaces-plugin/public';
import type { SavedObjectsManagementRecord } from '../types';
import { SavedObjectsManagementAction } from '../types';
export declare class CopyToSpaceSavedObjectsManagementAction extends SavedObjectsManagementAction {
    private readonly spacesApiUi;
    id: string;
    euiAction: {
        name: string;
        description: string;
        icon: string;
        type: string;
        available: (object: SavedObjectsManagementRecord) => boolean;
        onClick: (object: SavedObjectsManagementRecord) => void;
    };
    constructor(spacesApiUi: SpacesApiUi);
    render: () => React.JSX.Element;
    private onClose;
}
