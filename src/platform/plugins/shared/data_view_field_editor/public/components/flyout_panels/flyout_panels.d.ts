import React from 'react';
import type { EuiFlexGroupProps, EuiFlyoutProps } from '@elastic/eui';
interface Panel {
    width?: number;
}
interface Context {
    addPanel: (panel: Panel) => {
        removePanel: () => void;
        isFixedWidth: boolean;
    };
}
export interface Props {
    /**
     * The total max width with all the panels in the DOM
     * Corresponds to the "maxWidth" prop passed to the EuiFlyout
     */
    maxWidth: EuiFlyoutProps['maxWidth'];
    /** The className selector of the flyout */
    flyoutClassName: string;
    /** The size between the panels. Corresponds to EuiFlexGroup gutterSize */
    gutterSize?: EuiFlexGroupProps['gutterSize'];
    /** Flag to indicate if the panels width are declared as fixed pixel width instead of percent */
    fixedPanelWidths?: boolean;
    children: React.ReactNode;
}
export declare const Panels: React.FC<Props>;
export declare const useFlyoutPanelsContext: () => Context;
export {};
