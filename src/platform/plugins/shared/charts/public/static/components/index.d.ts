import React from 'react';
export { CurrentTime } from './current_time';
export { EmptyPlaceholder } from './empty_placeholder';
export { useCommonChartStyles } from './common_chart_styles';
export * from './endzones';
export * from './warnings';
/**
 * The Lazily-loaded `ColorPicker` component.  Consumers should use `React.Suspense` or
 * the withSuspense` HOC to load this component.
 */
export declare const ColorPickerLazy: React.LazyExoticComponent<({ onChange, color: selectedColor, label, useLegacyColors, colorIsOverwritten, onKeyDown, maxDepth, layerIndex, }: import("./color_picker").ColorPickerProps) => React.JSX.Element>;
/**
 * A `ColorPicker` component that is wrapped by the `withSuspense` HOC. This component can
 * be used directly by consumers and will load the `ColorPickerLazy` component lazily with
 * a predefined fallback and error boundary.
 */
export declare const ColorPicker: React.ForwardRefExoticComponent<import("./color_picker").ColorPickerProps & import("@kbn/shared-ux-utility").WithSuspenseExtendedDeps & React.RefAttributes<{}>>;
/**
 * The Lazily-loaded `LegendToggle` component.  Consumers should use `React.Suspense` or
 * the withSuspense` HOC to load this component.
 */
export declare const LegendToggleLazy: React.LazyExoticComponent<React.MemoExoticComponent<({ onClick, showLegend, legendPosition }: import("./legend_toggle").LegendToggleProps) => React.JSX.Element>>;
/**
 * A `LegendToggle` component that is wrapped by the `withSuspense` HOC. This component can
 * be used directly by consumers and will load the `LegendToggleLazy` component lazily with
 * a predefined fallback and error boundary.
 */
export declare const LegendToggle: React.ForwardRefExoticComponent<import("./legend_toggle").LegendToggleProps & import("@kbn/shared-ux-utility").WithSuspenseExtendedDeps & React.RefAttributes<{}>>;
