import type { FC, PropsWithChildren } from 'react';
import React from 'react';
interface Content<P extends object = {
    [key: string]: any;
}> {
    id: string;
    Component: React.FunctionComponent<P>;
    props?: P;
    flyoutProps?: {
        [key: string]: any;
    };
    cleanUpFunc?: () => void;
}
export declare const GlobalFlyoutProvider: FC<PropsWithChildren<unknown>>;
export declare const useGlobalFlyout: () => {
    addContent: <P extends object = {
        [key: string]: any;
    }>(content: Content<P>) => void;
    removeContent: (contentId: string) => void;
    closeFlyout: () => void;
};
export {};
