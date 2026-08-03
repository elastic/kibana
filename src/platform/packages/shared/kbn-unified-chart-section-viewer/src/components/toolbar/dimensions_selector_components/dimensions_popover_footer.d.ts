import React from 'react';
interface DimensionsPopoverFooterProps {
    count: number;
    onClear: () => void;
}
/**
 * Footer row rendered below the search input in the dimensions popover.
 * Shows the current selection count and a "Clear selection" action when
 * there is anything to clear.
 */
export declare const DimensionsPopoverFooter: ({ count, onClear }: DimensionsPopoverFooterProps) => React.JSX.Element;
export {};
