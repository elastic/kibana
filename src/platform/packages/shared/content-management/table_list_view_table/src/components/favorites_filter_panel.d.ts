import React from 'react';
interface FavoritesFilterButtonProps {
    isFavoritesOnly: boolean;
    onToggleFavorites: () => void;
}
export declare function FavoritesFilterButton({ isFavoritesOnly, onToggleFavorites, }: FavoritesFilterButtonProps): React.JSX.Element;
export {};
