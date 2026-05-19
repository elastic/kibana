import type { ReactNode, ReactElement, MouseEvent, KeyboardEvent, Ref } from 'react';
export interface PopoverIds {
    popoverNavigationInstructionsId: string;
}
export type PopoverChildren = ReactNode | ((closePopover: () => void, ids?: PopoverIds) => ReactNode);
export interface PopoverProps {
    children?: PopoverChildren;
    container?: HTMLElement;
    hasContent: boolean;
    isSidePanelOpen: boolean;
    isAnyPopoverLocked?: boolean;
    setIsLocked?: (isLocked: boolean) => void;
    label: string;
    persistent?: boolean;
    trigger: ReactElement<{
        ref?: Ref<HTMLElement>;
        onClick?: (e: MouseEvent) => void;
        onKeyDown?: (e: KeyboardEvent) => void;
        tabIndex?: number;
        'aria-haspopup'?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
        'aria-expanded'?: boolean;
        'aria-describedby'?: string;
    }>;
}
/**
 * The side nav popover differs from the regular `EuiPopover`:
 * - it opens on focus and hover, instead of just click,
 * - it handles keyboard navigation
 *   - Enter to move focus into the popover
 *   - Arrow keys to move focus between elements,
 *   - Escape to move focus back to the trigger.
 */
export declare const Popover: ({ children, container, hasContent, isSidePanelOpen, isAnyPopoverLocked, setIsLocked, label, persistent, trigger, }: PopoverProps) => JSX.Element;
