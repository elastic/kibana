import React from 'react';
import type { SaveResult } from '@kbn/saved-objects-plugin/public';
import type { SavedObjectAccessControl } from '@kbn/core-saved-objects-common';
import type { DashboardSaveOptions } from './types';
interface DashboardSaveModalProps {
    onSave: ({ newTitle, newDescription, newCopyOnSave, newTags, newTimeRestore, newProjectRoutingRestore, newAccessMode, }: DashboardSaveOptions) => Promise<SaveResult>;
    onClose: () => void;
    lastSavedTitle: string;
    title: string;
    description: string;
    tags?: string[];
    timeRestore: boolean;
    projectRoutingRestore: boolean;
    showCopyOnSave: boolean;
    showStoreTimeOnSave?: boolean;
    showStoreProjectRoutingOnSave?: boolean;
    customModalTitle?: string;
    accessControl?: Partial<SavedObjectAccessControl>;
    showAccessContainer?: boolean;
}
export declare const DashboardSaveModal: React.FC<DashboardSaveModalProps>;
export {};
