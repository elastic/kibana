import React, { type PropsWithChildren } from 'react';
import type { IconType } from '@elastic/eui';
/** Metadata describing a navigable panel inside the date range picker dialog. */
export interface DateRangePickerPanelDescriptor {
    /** Unique panel identifier, used for navigation */
    id: string;
    /** Title shown in panel header or navigation button */
    title: string;
    /** Icon type passed to `EuiIcon` for the panel navigation item */
    icon?: IconType;
}
/** Context value exposed via `useDateRangePickerPanelNavigation()`. */
export interface DateRangePickerPanelNavigationContextValue {
    /** Id of the currently visible panel */
    activePanelId: string;
    /** Descriptors for all registered panels */
    panelDescriptors: DateRangePickerPanelDescriptor[];
    /** Push a panel onto the history stack and navigate to it */
    navigateTo: (panelId: string) => void;
    /** Pop back to the previous panel and navigate back */
    goBack: () => void;
    /** Whether there is a previous panel to go back to */
    canGoBack: boolean;
}
/**
 * Hook to access panel navigation inside the date range picker dialog.
 * Must be used within a `DateRangePickerPanelNavigationProvider`.
 */
export declare function useDateRangePickerPanelNavigation(): DateRangePickerPanelNavigationContextValue;
interface DateRangePickerPanelNavigationProviderProps {
    /** Panel id to show on initial mount */
    defaultPanelId: string;
    /** Descriptors for all panels available for navigation */
    panelDescriptors: DateRangePickerPanelDescriptor[];
}
/**
 * Provider that manages panel navigation state via a history stack.
 * Resets to `defaultPanelId` when unmounted and remounted (e.g. popover close/reopen).
 */
export declare function DateRangePickerPanelNavigationProvider({ defaultPanelId, panelDescriptors, children, }: PropsWithChildren<DateRangePickerPanelNavigationProviderProps>): React.JSX.Element;
interface DateRangePickerPanelProps {
    /** Panel identifier; children render only when this matches the active panel */
    id: string;
}
/**
 * Gate component that renders its children only when the panel is active.
 * Automatically saves and restores focus when navigating away and back,
 * so keyboard users return to the element they last interacted with.
 *
 * Use inside a `DateRangePickerPanelNavigationProvider`.
 */
export declare function DateRangePickerPanel({ id, children, }: PropsWithChildren<DateRangePickerPanelProps>): React.JSX.Element | null;
export {};
