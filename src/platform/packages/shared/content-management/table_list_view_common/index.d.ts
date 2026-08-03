import type { SavedObjectsReference } from '@kbn/content-management-content-editor';
export interface UserContentCommonSchema {
    id: string;
    updatedAt: string;
    updatedBy?: string;
    createdAt?: string;
    createdBy?: string;
    managed?: boolean;
    references: SavedObjectsReference[];
    type: string;
    attributes: {
        title: string;
        description?: string;
    };
}
