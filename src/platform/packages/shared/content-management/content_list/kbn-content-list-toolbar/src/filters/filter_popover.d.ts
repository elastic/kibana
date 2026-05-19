import React from 'react';
import { type EuiFilterButtonProps } from '@elastic/eui';
/**
 * Hook for managing filter popover open/close state.
 *
 * @returns An object containing `isOpen` state, `toggle` function, and `close` function.
 */
export declare const useFilterPopover: () => {
    isOpen: boolean;
    toggle: () => void;
    close: () => void;
};
/**
 * Props for the {@link FilterPopover} component.
 */
export interface FilterPopoverProps extends Pick<EuiFilterButtonProps, 'data-test-subj'> {
    /** Title displayed in the popover header. */
    title: string;
    /** Label displayed on the filter button (defaults to `title`). */
    buttonLabel?: string;
    /** Total item count shown in parens next to the title (e.g. "Tags (1000)"). */
    totalCount?: number;
    /** Number of active filters (shows badge on button). */
    activeCount?: number;
    /** Whether the popover is open. */
    isOpen: boolean;
    /** Toggle popover open/closed. */
    onToggle: () => void;
    /** Close the popover. */
    onClose: () => void;
    /** Width of the popover panel. */
    panelWidth?: number | string;
    /** Minimum width of the popover panel. */
    panelMinWidth?: number | string;
    /** Anchor position for the popover. */
    anchorPosition?: 'downCenter' | 'downLeft' | 'downRight';
    /** Popover content. */
    children: React.ReactNode;
}
/**
 * `FilterPopover` component.
 *
 * Base component for filter popovers with consistent styling.
 *
 * Provides:
 * - `EuiPopover` with arrow and proper padding.
 * - `EuiFilterButton` with active filter badge.
 * - Bold title header with border.
 *
 * @param props - The component props. See {@link FilterPopoverProps}.
 * @returns A React element containing the filter popover.
 *
 * @example
 * ```tsx
 * const { isOpen, toggle, close } = useFilterPopover();
 *
 * <FilterPopover
 *   title="Sort by"
 *   isOpen={isOpen}
 *   onToggle={toggle}
 *   onClose={close}
 * >
 *   <EuiSelectable ...>{(list) => list}</EuiSelectable>
 * </FilterPopover>
 * ```
 */
export declare const FilterPopover: ({ title, buttonLabel, totalCount, activeCount, isOpen, onToggle, onClose, panelWidth, panelMinWidth, anchorPosition, "data-test-subj": dataTestSubj, children, }: FilterPopoverProps) => React.JSX.Element;
