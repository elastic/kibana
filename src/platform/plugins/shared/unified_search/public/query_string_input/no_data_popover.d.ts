import React from 'react';
import type { ReactElement } from 'react';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
export declare const strings: {
    getNoDataPopoverContent: () => string;
    getNoDataPopoverSubtitle: () => string;
    getNoDataPopoverTitle: () => string;
    getNoDataPopoverDismissAction: () => string;
};
export declare function NoDataPopover({ showNoDataPopover, storage, children, }: {
    showNoDataPopover?: boolean;
    storage: IStorageWrapper;
    children: ReactElement;
}): React.JSX.Element;
