import React from 'react';
interface Context {
    registerFooter: () => void;
    registerContent: () => void;
}
export interface Props {
    /** Width of the panel (in percent %) */
    width?: number;
    /** EUI sass background */
    backgroundColor?: 'euiPageBackground' | 'euiEmptyShade';
    /** Add a border to the panel */
    border?: 'left' | 'right';
}
export declare const Panel: React.FC<Props & React.HTMLProps<HTMLDivElement>>;
export declare const useFlyoutPanelContext: () => Context;
export {};
