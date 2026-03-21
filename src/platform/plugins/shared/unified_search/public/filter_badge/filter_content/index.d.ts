import React from 'react';
/**
 * The Lazily-loaded `FilterContent` component.  Consumers should use `React.Suspense` or
 * the withSuspense` HOC to load this component.
 */
export declare const FilterContentLazy: React.LazyExoticComponent<typeof import("./filter_content").FilterContent>;
/**
 * A `FilterContent` component that is wrapped by the `withSuspense` HOC. This component can
 * be used directly by consumers and will load the `FilterContentLazy` component lazily with
 * a predefined fallback and error boundary.
 */
export declare const FilterContent: React.ForwardRefExoticComponent<import("./filter_content").FilterContentProps & import("@kbn/shared-ux-utility").WithSuspenseExtendedDeps & React.RefAttributes<{}>>;
