import React from 'react';
/**
 * The Lazily-loaded `FiltersBuilder` component.  Consumers should use `React.Suspense` or
 * the withSuspense` HOC to load this component.
 */
export declare const FiltersBuilderLazy: React.LazyExoticComponent<typeof import("./filters_builder").FiltersBuilder>;
/**
 * A `FiltersBuilder` component that is wrapped by the `withSuspense` HOC. This component can
 * be used directly by consumers and will load the `FiltersBuilderLazy` component lazily with
 * a predefined fallback and error boundary.
 */
export declare const FiltersBuilder: React.ForwardRefExoticComponent<import("./filters_builder").FiltersBuilderProps & import("@kbn/shared-ux-utility").WithSuspenseExtendedDeps & React.RefAttributes<{}>>;
