import type { CoreSetup, Logger } from '@kbn/core/server';
import type { FavoritesRegistry } from './favorites_registry';
/**
 * @public
 * Response for get favorites API
 */
export interface GetFavoritesResponse {
    favoriteIds: string[];
    favoriteMetadata?: Record<string, object>;
}
export interface AddFavoriteResponse {
    favoriteIds: string[];
}
export interface RemoveFavoriteResponse {
    favoriteIds: string[];
}
export declare function registerFavoritesRoutes({ core, logger, favoritesRegistry, }: {
    core: CoreSetup;
    logger: Logger;
    favoritesRegistry: FavoritesRegistry;
}): void;
