import { type HttpStart } from '@kbn/core-http-browser';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { UserProfileServiceStart } from '@kbn/core-user-profile-browser';
import type { AddFavoriteResponse, GetFavoritesResponse as GetFavoritesResponseServer, RemoveFavoriteResponse } from '@kbn/content-management-favorites-server';
export interface GetFavoritesResponse<Metadata extends object | void = void> extends GetFavoritesResponseServer {
    /**
     * When the client is instantiated without metadata (`Metadata = void`), we still return an empty
     * record for `favoriteMetadata` so callers can treat the response shape consistently, while
     * preventing access to values.
     */
    favoriteMetadata: Metadata extends object ? Record<string, Metadata> : Record<string, never>;
}
type AddFavoriteRequest<Metadata extends object | void> = Metadata extends object ? {
    id: string;
    metadata: Metadata;
} : {
    id: string;
};
export interface FavoritesClientPublic<Metadata extends object | void = void> {
    getFavorites(): Promise<GetFavoritesResponse<Metadata>>;
    addFavorite(params: AddFavoriteRequest<Metadata>): Promise<AddFavoriteResponse>;
    removeFavorite(params: {
        id: string;
    }): Promise<RemoveFavoriteResponse>;
    isAvailable(): Promise<boolean>;
    getFavoriteType(): string;
    reportAddFavoriteClick(): void;
    reportRemoveFavoriteClick(): void;
}
export declare class FavoritesClient<Metadata extends object | void = void> implements FavoritesClientPublic<Metadata> {
    private readonly appName;
    private readonly favoriteObjectType;
    private readonly deps;
    constructor(appName: string, favoriteObjectType: string, deps: {
        http: HttpStart;
        userProfile: UserProfileServiceStart;
        usageCollection?: UsageCollectionStart;
    });
    isAvailable(): Promise<boolean>;
    private ifAvailablePreCheck;
    private getUnavailableFavoritesResponse;
    getFavorites(): Promise<GetFavoritesResponse<Metadata>>;
    addFavorite(params: AddFavoriteRequest<Metadata>): Promise<AddFavoriteResponse>;
    removeFavorite({ id }: {
        id: string;
    }): Promise<RemoveFavoriteResponse>;
    getFavoriteType(): string;
    reportAddFavoriteClick(): void;
    reportRemoveFavoriteClick(): void;
}
export {};
