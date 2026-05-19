import React from 'react';
import type { OnSaveProps, SaveModalState, SaveResult } from '.';
interface SaveModalDocumentInfo {
    id?: string;
    title: string;
    description?: string;
}
export interface OriginSaveModalProps {
    originatingApp?: string;
    getAppNameFromId?: (appId: string) => string | undefined;
    originatingAppName?: string;
    returnToOriginSwitchLabel?: string;
    documentInfo: SaveModalDocumentInfo;
    objectType: string;
    onClose: () => void;
    options?: React.ReactNode | ((state: SaveModalState) => React.ReactNode);
    onSave: (props: OnSaveProps & {
        returnToOrigin: boolean;
    }) => Promise<SaveResult>;
    hasLibraryItemWithTitle: (title: string) => Promise<boolean>;
    lastSavedTitle: string;
}
export declare function SavedObjectSaveModalOrigin(props: OriginSaveModalProps): React.JSX.Element;
export {};
