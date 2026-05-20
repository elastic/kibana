import React from 'react';
interface HelpPopoverProps {
    button: any;
    isOpen: boolean;
    closePopover: () => void;
    resetTour: () => void;
}
export declare const HelpPopover: ({ button, isOpen, closePopover, resetTour }: HelpPopoverProps) => React.JSX.Element;
export {};
