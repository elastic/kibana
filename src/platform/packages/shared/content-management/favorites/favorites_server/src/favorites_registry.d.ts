import type { ObjectType } from '@kbn/config-schema';
interface FavoriteTypeConfig {
    typeMetadataSchema?: ObjectType;
}
export type FavoritesRegistrySetup = Pick<FavoritesRegistry, 'registerFavoriteType'>;
export declare class FavoritesRegistry {
    private favoriteTypes;
    registerFavoriteType(type: string, config?: FavoriteTypeConfig): void;
    hasType(type: string): boolean;
    validateMetadata(type: string, metadata?: object): void;
}
export {};
