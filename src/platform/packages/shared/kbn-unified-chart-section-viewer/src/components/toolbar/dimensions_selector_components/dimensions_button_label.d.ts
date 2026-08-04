import React from 'react';
interface DimensionsButtonLabelProps {
    count: number;
    isLoading: boolean;
}
/**
 * Content rendered inside the toolbar selector's trigger button.
 * - 0 selections: neutral "No dimensions selected" message
 * - 1+ selections: "Dimensions" + count badge
 * - Shows a loading spinner on the right while `isLoading` is true.
 */
export declare const DimensionsButtonLabel: ({ count, isLoading }: DimensionsButtonLabelProps) => React.JSX.Element;
export {};
