import type { SavedObjectsReference } from './services';
export interface Item {
    id: string;
    title: string;
    description?: string;
    tags: SavedObjectsReference[];
    createdAt?: string;
    createdBy?: string;
    updatedAt?: string;
    updatedBy?: string;
    managed?: boolean;
}
