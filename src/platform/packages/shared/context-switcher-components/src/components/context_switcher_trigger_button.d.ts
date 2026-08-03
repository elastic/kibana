import type { ReactElement } from 'react';
import type { IconType } from '@elastic/eui';
interface ContextSwitcherTriggerButtonProps {
    readonly solutionIcon: IconType;
    readonly label: string;
    readonly onClick: () => void;
    readonly isSelected?: boolean;
    readonly title?: string;
}
/**
 * Trigger button UI for the context switcher popover.
 * Solution logo (left), space name (middle), down arrow (right).
 */
export declare const ContextSwitcherTriggerButton: ({ solutionIcon, label, onClick, isSelected, title, }: ContextSwitcherTriggerButtonProps) => ReactElement;
export {};
