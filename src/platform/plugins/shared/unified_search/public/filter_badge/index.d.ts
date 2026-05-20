import React from 'react';
export { FilterContent, FilterContentLazy } from './filter_content';
/**
 * The Lazily-loaded `FilterBadge` component.  Consumers should use `React.Suspense` or
 * the withSuspense` HOC to load this component.
 */
export declare const FilterBadgeLazy: React.LazyExoticComponent<typeof import("./filter_badge").FilterBadge>;
/**
 * A `FilterBadge` component that is wrapped by the `withSuspense` HOC. This component can
 * be used directly by consumers and will load the `FilterBadgeLazy` component lazily with
 * a predefined fallback and error boundary.
 */
export declare const FilterBadge: React.ForwardRefExoticComponent<import("./filter_badge").FilterBadgeProps & import("@kbn/shared-ux-utility").WithSuspenseExtendedDeps & React.RefAttributes<{}>>;
/**
 * The Lazily-loaded `FilterBadgeGroup` component.  Consumers should use `React.Suspense` or
 * the withSuspense` HOC to load this component.
 */
export declare const FilterBadgeGroupLazy: React.LazyExoticComponent<typeof import("./filter_badge_group").FilterBadgeGroup>;
/**
 * A `FilterBadgeGroup` component that is wrapped by the `withSuspense` HOC. This component can
 * be used directly by consumers and will load the `FilterBadgeGroupLazy` component lazily with
 * a predefined fallback and error boundary.
 */
export declare const FilterBadgeGroup: React.ForwardRefExoticComponent<import("./filter_badge_group").FilterBadgeGroupProps & import("@kbn/shared-ux-utility").WithSuspenseExtendedDeps & React.RefAttributes<{}>>;
