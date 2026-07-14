import React from 'react';
interface LayoutDebugOverlayProps {
    colors?: Partial<Record<string, string>>;
}
/**
 * A debug overlay component that visually outlines the main layout slots (banner, header, navigation, sidebar, etc.)
 * using colored rectangles. This is useful for development and debugging to understand the placement and sizing of layout regions.
 *
 * @param props - {@link LayoutDebugOverlayProps} Optional colors to override the default slot colors.
 * @returns The rendered debug overlay as a fixed-position set of rectangles.
 */
export declare const LayoutDebugOverlay: React.FC<LayoutDebugOverlayProps>;
export {};
