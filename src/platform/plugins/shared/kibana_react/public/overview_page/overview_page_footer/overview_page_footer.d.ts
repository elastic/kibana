import type { FC, MouseEvent } from 'react';
interface Props {
    addBasePath: (path: string) => string;
    /** The path to set as the new default route in advanced settings */
    path: string;
    /** Callback function to invoke when the user wants to set their default route to the current page */
    onSetDefaultRoute?: (event: MouseEvent) => void;
    /** Callback function to invoke when the user wants to change their default route button is changed */
    onChangeDefaultRoute?: (event: MouseEvent) => void;
}
export declare const OverviewPageFooter: FC<Props>;
export {};
