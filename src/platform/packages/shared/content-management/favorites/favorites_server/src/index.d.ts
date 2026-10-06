import type { CoreSetup, Logger } from '@kbn/core/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { FavoritesRegistrySetup } from './favorites_registry';
export type { GetFavoritesResponse, AddFavoriteResponse, RemoveFavoriteResponse, } from './favorites_routes';
/**
 * @public
 * Setup contract for the favorites feature.
 */
export type FavoritesSetup = FavoritesRegistrySetup;
/**
 * @public
 * Registers the favorites feature enabling favorites saved object type and api routes.
 *
 * @param logger
 * @param core
 * @param usageCollection
 */
export declare function registerFavorites({ logger, core, usageCollection, }: {
    core: CoreSetup;
    logger: Logger;
    usageCollection?: UsageCollectionSetup;
}): FavoritesSetup;
