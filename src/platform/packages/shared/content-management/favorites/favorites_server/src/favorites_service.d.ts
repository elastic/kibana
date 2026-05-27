import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/core/server';
import type { FavoritesRegistry } from './favorites_registry';
export interface FavoritesState {
    favoriteIds: string[];
    favoriteMetadata?: Record<string, object>;
}
export declare class FavoritesService {
    private readonly type;
    private readonly userId;
    private readonly deps;
    constructor(type: string, userId: string, deps: {
        savedObjectClient: SavedObjectsClientContract;
        logger: Logger;
        favoritesRegistry: FavoritesRegistry;
    });
    getFavorites(): Promise<FavoritesState>;
    /**
     * @throws {FavoritesLimitExceededError}
     */
    addFavorite({ id, metadata, }: {
        id: string;
        metadata?: object;
    }): Promise<FavoritesState>;
    removeFavorite({ id }: {
        id: string;
    }): Promise<FavoritesState>;
    private getFavoritesSavedObject;
    private getFavoriteSavedObjectId;
}
export declare class FavoritesLimitExceededError extends Error {
    constructor();
}
