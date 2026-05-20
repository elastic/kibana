import React from 'react';
/**
 * Props for a {@link UnsavedCount} component.
 */
interface UnsavedCountProps {
    unsavedCount: number;
    hiddenCount: number;
}
/**
 * Component for displaying the count of unsaved changes in a {@link BottomBar}.
 */
export declare const UnsavedCount: ({ unsavedCount, hiddenCount }: UnsavedCountProps) => React.JSX.Element;
export {};
