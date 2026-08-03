import React from 'react';
interface Context {
    registerFooter: () => void;
    registerContent: () => void;
}
export interface Props {
    /** Width of the panel (in percent % or in px if the "fixedPanelWidths" prop is set to true on the panels group) */
    width?: number;
    /** EUI sass background */
    backgroundColor?: 'euiPageBackground' | 'euiEmptyShade';
    /** Add a border to the panel */
    border?: 'left' | 'right';
    'data-test-subj'?: string;
}
export declare const Panel: React.FC<Props & React.HTMLProps<HTMLDivElement>>;
export declare const useFlyoutPanelContext: () => Context;
export {};
