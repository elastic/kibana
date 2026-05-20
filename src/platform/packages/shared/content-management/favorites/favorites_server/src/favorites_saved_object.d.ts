import type { SavedObjectsType } from '@kbn/core/server';
export interface FavoritesSavedObjectAttributes {
    userId: string;
    type: string;
    favoriteIds: string[];
    favoriteMetadata?: Record<string, object>;
}
export declare const favoritesSavedObjectName = "favorites";
export declare const favoritesSavedObjectType: SavedObjectsType;
