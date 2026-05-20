import React from 'react';
interface ShortcutsPopoverProps {
    button: any;
    isOpen: boolean;
    closePopover: () => void;
}
export declare const ShortcutsPopover: ({ button, isOpen, closePopover }: ShortcutsPopoverProps) => React.JSX.Element;
export {};
