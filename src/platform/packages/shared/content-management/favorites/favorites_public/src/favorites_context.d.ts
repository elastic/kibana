import React from 'react';
import type { FavoritesClientPublic } from './favorites_client';
interface FavoritesContextValue {
    favoritesClient?: FavoritesClientPublic;
    notifyError?: (title: JSX.Element, text?: string) => void;
}
export declare const FavoritesContextProvider: React.FC<React.PropsWithChildren<FavoritesContextValue>>;
export declare const useFavoritesContext: () => FavoritesContextValue | null;
export declare const useFavoritesClient: () => FavoritesClientPublic<void> | undefined;
export {};
