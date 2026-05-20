import type { IHttpFetchError } from '@kbn/core-http-browser';
export declare const useFavorites: ({ enabled }?: {
    enabled?: boolean;
}) => import("@kbn/react-query").UseQueryResult<import("./favorites_client").GetFavoritesResponse<void>, unknown>;
export declare const useAddFavorite: () => import("@kbn/react-query").UseMutationResult<import("@kbn/content-management-favorites-server").AddFavoriteResponse, IHttpFetchError<{
    message?: string;
}>, {
    id: string;
}, unknown>;
export declare const useRemoveFavorite: () => import("@kbn/react-query").UseMutationResult<import("@kbn/content-management-favorites-server").RemoveFavoriteResponse, Error, {
    id: string;
}, unknown>;
