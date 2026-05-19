import type { FC, PropsWithChildren } from 'react';
import type { EuiFlexGroupProps } from '@elastic/eui';
interface Panel {
    width?: number;
}
interface Context {
    addPanel: (panel: Panel) => () => void;
}
export interface Props {
    /**
     * The total max width with all the panels in the DOM
     * Corresponds to the "maxWidth" prop passed to the EuiFlyout
     */
    maxWidth: number;
    /** The className selector of the flyout */
    flyoutClassName: string;
    /** The size between the panels. Corresponds to EuiFlexGroup gutterSize */
    gutterSize?: EuiFlexGroupProps['gutterSize'];
}
export declare const Panels: FC<PropsWithChildren<Props>>;
export declare const useFlyoutPanelsContext: () => Context;
export {};
