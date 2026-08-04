import type { FavoriteButtonStatus } from '@kbn/favorite-button';
export interface FavoriteToggleState {
    status: FavoriteButtonStatus;
    onToggle: () => void;
}
/**
 * Favorite toggle state for a single item.
 * Returns `undefined` until an id is present and favorites data has loaded.
 * Shape is structurally compatible with Core `AppHeaderFavoriteAction`.
 */
export declare const useFavorite: ({ id }: {
    id?: string;
}) => FavoriteToggleState | undefined;
