import React, { type ReactNode } from 'react';
/**
 * Provides favorites client + query context for dashboard favorite UI.
 * Required around any component that calls `useFavorite`.
 */
export declare const DashboardFavoritesProvider: ({ children }: {
    children: ReactNode;
}) => React.JSX.Element;
/** Legacy chrome breadcrumbs append: self-contained favorite button with its own providers. */
export declare const DashboardFavoriteButton: ({ dashboardId }: {
    dashboardId?: string;
}) => React.JSX.Element;
