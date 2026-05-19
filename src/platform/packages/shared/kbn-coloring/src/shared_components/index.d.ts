import React from 'react';
/**
 * The Lazily-loaded `CustomizablePalette` component.  Consumers should use `React.Suspense` or
 * the withSuspense` HOC to load this component.
 */
export declare const CustomizablePaletteLazy: React.LazyExoticComponent<({ palettes, activePalette, setPalette, dataBounds, showExtraActions, showRangeTypeSelector, disableSwitchingContinuity, }: import("./coloring/palette_configuration").CustomizablePaletteProps) => React.JSX.Element>;
/**
 * A `CustomizablePalette` component that is wrapped by the `withSuspense` HOC. This component can
 * be used directly by consumers and will load the `KibanaPageTemplateSolutionNavAvatarLazy` component lazily with
 * a predefined fallback and error boundary.
 */
export declare const CustomizablePalette: React.ForwardRefExoticComponent<import("./coloring/palette_configuration").CustomizablePaletteProps & import("@kbn/shared-ux-utility").WithSuspenseExtendedDeps & React.RefAttributes<{}>>;
export * from './color_mapping';
