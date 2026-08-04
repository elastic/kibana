import type { SavedObjectReference, SavedObjectsNamespaceType } from '@kbn/core/public';
export interface SavedObjectsManagementRecord {
    type: string;
    id: string;
    meta: {
        icon: string;
        title: string;
        namespaceType: SavedObjectsNamespaceType;
        hiddenType: boolean;
    };
    references: SavedObjectReference[];
    namespaces?: string[];
}
