import type React from 'react';
/**
 * Dimensions for each layout section in the Chrome UI.
 *
 * This interface defines the pixel sizes for key layout areas such as banner, footer, header,
 * navigation, and sidebar
 */
export interface LayoutDimensions {
    bannerHeight: number;
    footerHeight: number;
    headerHeight: number;
    navigationWidth: number;
    sidebarWidth: number;
    applicationTopBarHeight: number;
    applicationBottomBarHeight: number;
    applicationMarginTop: number;
    applicationMarginBottom: number;
    applicationMarginRight: number;
}
/**
 * The state of the layout.
 */
export interface LayoutState extends LayoutDimensions {
    hasBanner: boolean;
    hasFooter: boolean;
    hasSidebar: boolean;
    hasHeader: boolean;
    hasNavigation: boolean;
    hasApplicationTopBar: boolean;
    hasApplicationBottomBar: boolean;
}
/**
 * Props for the slots.
 */
export type SlotProps = LayoutState;
/**
 * A slot is a React node or a function that returns a React node.
 */
export type Slot = React.ReactNode | ((props: SlotProps) => React.ReactNode);
/**
 * Supported slots for the layout
 */
export interface ChromeLayoutSlots {
    header?: Slot | null;
    navigation?: Slot | null;
    banner?: Slot | null;
    footer?: Slot | null;
    sidebar?: Slot | null;
    applicationTopBar?: Slot | null;
    applicationBottomBar?: Slot | null;
}
/**
 * Chrome style variants.
 *
 * @todo - we want to make sure layout code is kibana agnostic, so we need to evaluate if these styles
 *         are generic enough or if they should be moved to a kibana specific package.
 *         https://github.com/elastic/kibana/issues/251035
 */
export type ChromeStyle = 'classic' | 'project';
